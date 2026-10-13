// Headless test of the content script: extraction + AI-plan application.
// Run: npm run test:extension (builds first, then runs this against dist-extension/)
import { JSDOM } from 'jsdom';
import { pathToFileURL } from 'url';

const html = `
<form id="app">
  <label for="fn">First name</label>
  <input id="fn" type="text" />
  <label>Last name <input id="ln" type="text" /></label>
  <input id="em" type="email" aria-label="Email address" />
  <input id="ph" type="tel" placeholder="Phone" />
  <label for="loc">Location (City, State)</label>
  <input id="loc" type="text" />
  <label for="vet">Veteran status</label>
  <select id="vet"><option value="">Select</option><option>Yes</option><option>No</option></select>
  <label for="cover">Cover letter</label>
  <textarea id="cover"></textarea>
  <label for="pref">Already filled <input id="pref" type="text" value="do not touch" /></label>
  <input id="hid" type="hidden" value="x" />
  <input id="resume" type="file" />
  <input id="sub" type="submit" value="Submit" />
</form>`;

const dom = new JSDOM(html, { url: 'https://example.com/apply' });
const { window } = dom;

// jsdom has no layout; pretend everything is visible.
window.Element.prototype.getBoundingClientRect = () => ({
  width: 100, height: 20, top: 0, left: 0, bottom: 20, right: 100, x: 0, y: 0,
  toJSON: () => ({}),
});

for (const k of ['document', 'window', 'Element', 'HTMLElement', 'HTMLInputElement',
  'HTMLSelectElement', 'HTMLTextAreaElement', 'Event', 'getComputedStyle', 'CSS', 'Node']) {
  globalThis[k] = window[k];
}

// Capture the message listener the content script registers.
let listener = null;
let sentFields = null;
globalThis.chrome = {
  runtime: {
    onMessage: { addListener: (fn) => { listener = fn; } },
    sendMessage: async (msg) => {
      if (msg.type === 'af_map') {
        sentFields = msg.fields;
        // Canned AI plan: fill name/email/phone/location, skip veteran + cover letter.
        return {
          items: msg.fields.map((f) => ({
            uid: f.uid,
            value:
              f.label === 'First name' ? 'Adam' :
              f.label === 'Last name' ? 'Bailey' :
              f.label === 'Email address' ? 'adam@example.com' :
              f.label === 'Phone' ? '260-555-0100' :
              f.label === 'Location (City, State)' ? 'Fort Wayne, IN' :
              null,
          })),
        };
      }
      throw new Error('unexpected message ' + msg.type);
    },
  },
};

await import(pathToFileURL('./dist-extension/content.js').href);
if (!listener) throw new Error('content script did not register a listener');

// Track events the way React would (to prove native setter + dispatch works).
const events = [];
for (const id of ['fn', 'ln', 'em', 'ph', 'loc', 'vet', 'cover']) {
  const el = document.getElementById(id);
  el.addEventListener('input', () => events.push(id + ':input'));
  el.addEventListener('change', () => events.push(id + ':change'));
}

const result = await new Promise((resolve) => listener({ type: 'af_fill' }, {}, resolve));
console.log('fill result:', JSON.stringify(result));

const val = (id) => document.getElementById(id).value;
const checks = [
  ['first name filled', val('fn') === 'Adam'],
  ['last name filled (wrapping label)', val('ln') === 'Bailey'],
  ['email filled (aria-label)', val('em') === 'adam@example.com'],
  ['phone filled (placeholder)', val('ph') === '260-555-0100'],
  ['location filled', val('loc') === 'Fort Wayne, IN'],
  ['prefilled field untouched', val('pref') === 'do not touch'],
  ['veteran select skipped by AI', val('vet') === ''],
  ['cover letter skipped by AI', val('cover') === ''],
  ['hidden/file/submit not extracted', !sentFields.some((f) => ['hid', 'resume', 'sub'].includes(f.id))],
  ['input+change events fired', events.includes('fn:input') && events.includes('fn:change')],
  ['result counts', result.ok === true && result.filled === 5 && result.skipped === 2],
];
let failed = 0;
for (const [name, ok] of checks) {
  console.log((ok ? 'PASS' : 'FAIL') + ' - ' + name);
  if (!ok) failed++;
}
console.log(failed === 0 ? 'ALL TESTS PASSED' : `${failed} TESTS FAILED`);
process.exit(failed === 0 ? 0 : 1);
