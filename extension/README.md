# ApplyFlow browser extension (Manifest V3)

True autofill for job applications. The extension reads the current page's form
fields, asks Gemini which profile value belongs in each one, and fills them.
It **fills — it never submits**. You review everything before hitting submit.

## Build

```bash
npm install
GEMINI_API_KEY=your-key-here npm run build:extension
```

Output goes to `dist-extension/`. The key is baked into the extension bundle —
fine for personal sideloaded use, not for publishing to a store.

## Load it in Chrome / Edge / Brave (on your PC)

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked** and pick the `dist-extension` folder
4. Pin the ApplyFlow icon to the toolbar

## Use

1. Click the ApplyFlow icon. First time: paste your resume text, hit **Build profile**.
   The profile is stored in the extension (`chrome.storage.local`).
2. Open any job application page, click the icon, hit **Fill this page**.
3. Fields it filled get a brief green outline. Check everything, then submit by hand.

## What it does and doesn't do

- Fills text fields, dropdowns, and text areas it can match to your profile.
- Skips fields the page already filled, and skips equal-opportunity / demographic
  questions (veteran status, disability, gender, race…) — those stay yours to answer.
- Never invents data: if the AI can't match a field to your profile, it leaves it blank.
- Work-history sections with "add another job" buttons are not handled yet.

## Verify the core logic headlessly

```bash
npm run test:extension
```

Runs the built content script against a fake application form in jsdom and checks
extraction, label resolution, skip rules, and React-style event dispatch.
