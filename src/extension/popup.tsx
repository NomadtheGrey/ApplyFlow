import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import type { UserProfile } from '../types';
import type { FillResult } from './protocol';
import { getProfile, setProfile } from './storage';
import { parseResume } from '../services/geminiService';

type Phase =
  | { kind: 'loading' }
  | { kind: 'setup'; building: boolean; error: string | null }
  | { kind: 'ready'; filling: boolean; result: FillResult | null };

function Popup() {
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [resumeText, setResumeText] = useState('');

  useEffect(() => {
    getProfile().then((p) => {
      setProfileState(p);
      setPhase(p ? { kind: 'ready', filling: false, result: null } : { kind: 'setup', building: false, error: null });
    });
  }, []);

  const handleBuild = async () => {
    if (!resumeText.trim()) return;
    setPhase({ kind: 'setup', building: true, error: null });
    try {
      const p = await parseResume(resumeText);
      await setProfile(p);
      setProfileState(p);
      setPhase({ kind: 'ready', filling: false, result: null });
    } catch (e) {
      setPhase({ kind: 'setup', building: false, error: `Couldn't build the profile: ${String(e)}` });
    }
  };

  const handleClear = async () => {
    await setProfile(null);
    setProfileState(null);
    setResumeText('');
    setPhase({ kind: 'setup', building: false, error: null });
  };

  const handleFill = async () => {
    setPhase({ kind: 'ready', filling: true, result: null });
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('No active tab found.');
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      });
      const result = (await chrome.tabs.sendMessage(tab.id, { type: 'af_fill' })) as FillResult;
      setPhase({ kind: 'ready', filling: false, result });
    } catch (e) {
      const msg = String(e);
      const friendly = msg.includes('Cannot access')
        ? 'ApplyFlow cannot run on this page (browser system pages are off-limits).'
        : `Fill failed: ${msg}`;
      setPhase({ kind: 'ready', filling: false, result: { ok: false, error: friendly } });
    }
  };

  return (
    <div className="w-[380px] bg-slate-950 text-slate-100 p-4 font-sans">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center text-sm font-bold">A</div>
        <div>
          <div className="font-semibold leading-tight">ApplyFlow</div>
          <div className="text-xs text-slate-400 leading-tight">AI application autofill</div>
        </div>
      </div>

      {phase.kind === 'loading' && <p className="text-sm text-slate-400">Loading…</p>}

      {phase.kind === 'setup' && (
        <div>
          <p className="text-sm text-slate-300 mb-2">
            No profile yet. Paste your resume text and I'll build your fill profile from it.
          </p>
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            rows={8}
            placeholder="Paste resume text here…"
            className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
          {phase.error && <p className="text-xs text-red-400 mt-2">{phase.error}</p>}
          <button
            onClick={handleBuild}
            disabled={phase.building || !resumeText.trim()}
            className="mt-2 w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-2 text-sm font-medium"
          >
            {phase.building ? 'Building profile…' : 'Build profile'}
          </button>
        </div>
      )}

      {phase.kind === 'ready' && profile && (
        <div>
          <div className="rounded-lg bg-slate-900 border border-slate-800 p-3 mb-3">
            <div className="text-sm font-medium">{profile.fullName}</div>
            <div className="text-xs text-slate-400">{profile.email}</div>
            <div className="text-xs text-slate-400">{profile.phone}</div>
          </div>
          <button
            onClick={handleFill}
            disabled={phase.filling}
            className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-2 text-sm font-medium"
          >
            {phase.filling ? 'Reading the page…' : 'Fill this page'}
          </button>

          {phase.result && (
            <div className="mt-3 text-sm rounded-lg p-3 border border-slate-800 bg-slate-900">
              {phase.result.ok ? (
                <p className="text-slate-200">
                  Filled <span className="font-semibold text-green-400">{phase.result.filled}</span> fields
                  {phase.result.skipped ? (
                    <>, skipped <span className="font-semibold text-amber-400">{phase.result.skipped}</span></>
                  ) : null}
                  . Give it a look before you submit — I fill, I never submit.
                </p>
              ) : (
                <p className="text-red-400 text-xs">{phase.result.error}</p>
              )}
            </div>
          )}

          <button onClick={handleClear} className="mt-3 text-xs text-slate-500 hover:text-slate-300 underline">
            Replace profile with a different resume
          </button>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Popup />);
