// Background service worker (Manifest V3). Event-driven: it wakes on messages,
// does the Gemini work via the shared service, responds, and sleeps again.
// The API key is bundled here (and in the popup) — fine for personal sideloaded
// use, not for store publishing.

import type { FieldDescriptor, FillPlan } from './protocol';
import { getProfile } from './storage';
import { mapFieldsToProfile } from '../services/geminiService';

async function handleMap(fields: FieldDescriptor[]): Promise<FillPlan & { error?: string }> {
  const profile = await getProfile();
  if (!profile) {
    return { items: fields.map((f) => ({ uid: f.uid, value: null })) };
  }
  return mapFieldsToProfile(profile, fields);
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'af_map' && Array.isArray(msg.fields)) {
    handleMap(msg.fields as FieldDescriptor[])
      .then(sendResponse)
      .catch((e: unknown) => sendResponse({ items: [], error: String(e) }));
    return true; // async response
  }
  return false;
});
