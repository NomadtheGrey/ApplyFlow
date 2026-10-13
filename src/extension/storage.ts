// Profile persistence. Inside the extension we use chrome.storage.local so the
// popup, background worker, and (via messages) the content script share one copy.
// Falls back to window.localStorage when chrome.storage is unavailable (dev).

import type { UserProfile } from '../types';

const KEY = 'applyflow_profile';

function hasChromeStorage(): boolean {
  try {
    return typeof chrome !== 'undefined' && !!chrome.storage?.local;
  } catch {
    return false;
  }
}

export async function getProfile(): Promise<UserProfile | null> {
  if (hasChromeStorage()) {
    const result = await chrome.storage.local.get(KEY);
    return (result[KEY] as UserProfile | undefined) ?? null;
  }
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

export async function setProfile(profile: UserProfile | null): Promise<void> {
  if (hasChromeStorage()) {
    if (profile) {
      await chrome.storage.local.set({ [KEY]: profile });
    } else {
      await chrome.storage.local.remove(KEY);
    }
    return;
  }
  if (profile) {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } else {
    localStorage.removeItem(KEY);
  }
}
