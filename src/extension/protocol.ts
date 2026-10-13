// Shared message protocol between the popup, background worker, and content script.
// Only `import type` this file from the content script so it stays dependency-free
// (content scripts must bundle into a single file with no shared chunks).

export interface FieldDescriptor {
  uid: string;
  tag: 'input' | 'select' | 'textarea';
  /** input type, e.g. text, email, tel, checkbox, radio, date */
  type: string;
  /** Best human-readable label we could find (label element, aria-label, placeholder, name). */
  label: string;
  name: string;
  id: string;
  placeholder: string;
  /** For selects: visible option texts. */
  options?: string[];
  /** True when the page already has a value in the field (we skip those). */
  hasValue: boolean;
}

export interface FillItem {
  uid: string;
  /** null = skip this field (no matching profile data, EEO field, or uncertain). */
  value: string | null;
}

export interface FillPlan {
  items: FillItem[];
}

export interface FillResult {
  ok: boolean;
  filled?: number;
  skipped?: number;
  error?: string;
}
