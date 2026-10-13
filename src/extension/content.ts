// Content script. Injected on demand (via chrome.scripting) only when the user
// clicks "Fill this page" — it does not run on every page load.
//
// Flow: extract visible form fields -> ask the background worker for an AI fill
// plan -> apply the plan to the live elements -> report counts.

import type { FieldDescriptor, FillItem, FillPlan, FillResult } from './protocol';

const EXCLUDED_TYPES = new Set(['hidden', 'submit', 'button', 'reset', 'image', 'file']);
const MAX_FIELDS = 60;
// Matches placeholder-style first options in <select> ("Select…", "Choose…").
const SELECT_PLACEHOLDER = /^(select|choose|please\s+(select|choose)|pick|--)/i;

interface TrackedField {
  el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  desc: FieldDescriptor;
}

// Live element references, keyed by uid. Kept in the isolated world so the fill
// plan can be applied without re-querying the DOM.
const tracked = new Map<string, TrackedField>();

function isVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  return getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none';
}

function textOf(el: Element | null): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function resolveLabel(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string {
  // 1. <label for="id">
  if (el.id) {
    const byFor = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    const t = textOf(byFor);
    if (t) return t;
  }
  // 2. wrapping <label>
  const wrap = el.closest('label');
  if (wrap) {
    const clone = wrap.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('input,select,textarea').forEach((n) => n.remove());
    const t = textOf(clone);
    if (t) return t;
  }
  // 3. aria-labelledby
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const t = labelledBy
      .split(/\s+/)
      .map((id) => textOf(document.getElementById(id)))
      .filter(Boolean)
      .join(' ');
    if (t) return t;
  }
  // 4. aria-label, then placeholder, then name, then id
  return (
    el.getAttribute('aria-label')?.trim() ||
    el.getAttribute('placeholder')?.trim() ||
    el.getAttribute('name')?.trim() ||
    el.id.trim()
  );
}

function selectHasValue(el: HTMLSelectElement): boolean {
  const opt = el.selectedOptions[0];
  if (!opt) return false;
  // A selected placeholder ("Select…", value="") counts as empty.
  if (SELECT_PLACEHOLDER.test(opt.text.replace(/\s+/g, ' ').trim())) return false;
  return opt.value.trim() !== '' || opt.text.replace(/\s+/g, ' ').trim() !== '';
}

function currentValue(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string {
  if (el instanceof HTMLSelectElement) {
    return selectHasValue(el) ? (el.selectedOptions[0]?.text ?? '') : '';
  }
  if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
    return el.checked ? 'checked' : '';
  }
  return el.value ?? '';
}

function extractFields(): TrackedField[] {
  tracked.clear();
  const out: TrackedField[] = [];
  const nodes = document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    'input, select, textarea'
  );
  let n = 0;
  for (const el of nodes) {
    if (out.length >= MAX_FIELDS) break;
    const type = (el.getAttribute('type') ?? el.tagName.toLowerCase()).toLowerCase();
    if (EXCLUDED_TYPES.has(type)) continue;
    if (el.disabled) continue;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      if (el.readOnly) continue;
    }
    if (!isVisible(el)) continue;

    const uid = `f${n++}`;
    const options =
      el instanceof HTMLSelectElement
        ? Array.from(el.options)
            .map((o) => o.text.replace(/\s+/g, ' ').trim())
            .filter(Boolean)
        : undefined;
    const value = currentValue(el);
    const desc: FieldDescriptor = {
      uid,
      tag: el.tagName.toLowerCase() as FieldDescriptor['tag'],
      type,
      label: resolveLabel(el),
      name: el.getAttribute('name') ?? '',
      id: el.id ?? '',
      placeholder: el.getAttribute('placeholder') ?? '',
      options,
      hasValue: value.trim().length > 0,
    };
    // Never touch fields the page already filled.
    if (desc.hasValue) continue;
    tracked.set(uid, { el, desc });
    out.push({ el, desc });
  }
  return out;
}

/** Set a value the way the page's own framework expects: native setter + events. */
function setFieldValue(
  el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  value: string
): boolean {
  if (el instanceof HTMLSelectElement) {
    const wanted = value.trim().toLowerCase();
    const idx = Array.from(el.options).findIndex(
      (o) =>
        o.text.replace(/\s+/g, ' ').trim().toLowerCase() === wanted ||
        o.value.trim().toLowerCase() === wanted
    );
    if (idx < 0) return false;
    el.selectedIndex = idx;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
    const wantChecked = /^(yes|true|1|x|checked)$/i.test(value.trim());
    const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked');
    if (proto?.set) proto.set.call(el, wantChecked);
    else el.checked = wantChecked;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  const proto =
    el instanceof HTMLTextAreaElement
      ? Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')
      : Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  if (proto?.set) proto.set.call(el, value);
  else (el as HTMLInputElement | HTMLTextAreaElement).value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function flash(el: HTMLElement): void {
  const prev = el.style.outline;
  el.style.outline = '2px solid #22c55e';
  el.style.outlineOffset = '1px';
  window.setTimeout(() => {
    el.style.outline = prev;
    el.style.outlineOffset = '';
  }, 1600);
}

async function handleFill(): Promise<FillResult> {
  const fields = extractFields();
  if (fields.length === 0) {
    return { ok: false, error: 'No empty fields found on this page.' };
  }
  let plan: FillPlan & { error?: string };
  try {
    plan = await chrome.runtime.sendMessage({
      type: 'af_map',
      fields: fields.map((f) => f.desc),
    });
  } catch (e) {
    return { ok: false, error: `Could not reach the ApplyFlow worker: ${String(e)}` };
  }
  if (plan.error) {
    return { ok: false, error: plan.error };
  }
  if (!plan || !Array.isArray(plan.items)) {
    return { ok: false, error: 'The AI returned an unusable fill plan.' };
  }
  let filled = 0;
  let skipped = 0;
  for (const item of plan.items as FillItem[]) {
    const t = tracked.get(item.uid);
    if (!t || item.value == null || item.value === '') {
      skipped++;
      continue;
    }
    try {
      if (setFieldValue(t.el, item.value)) {
        filled++;
        flash(t.el);
      } else {
        skipped++;
      }
    } catch {
      skipped++;
    }
  }
  return { ok: true, filled, skipped };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'af_fill') {
    handleFill().then(sendResponse);
    return true; // keep the channel open for the async response
  }
  return false;
});
