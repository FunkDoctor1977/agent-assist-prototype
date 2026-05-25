"use client";

import { useState } from "react";

const DEFAULT_SCRIPT = `agent: Good afternoon, you've reached Northwind Support, this is Sarah. How can I help today?
customer: Hi Sarah, I'm trying to get into my online account but it keeps locking me out.
agent: I'm sorry to hear that. Can I take the email on the account?
customer: It's james.miller@gmail.com. I've tried resetting three times and it says the email isn't recognised.
agent: Let me have a quick look. One moment.
customer: This is the second time this week I've had to call. I'm getting really frustrated, I just want to pay my bill.
agent: I completely understand, I'll do everything I can to get this sorted in this call.
customer: If this doesn't get fixed today I'm going to have to look at moving providers, honestly.`;

type Props = {
  onStart: (script: string, apiKey: string) => void;
};

export function LiveModeSetup({ onStart }: Props) {
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  const lineCount = script.split(/\r?\n/).filter((l) => l.trim()).length;
  const canStart = lineCount > 0 && apiKey.trim().startsWith("sk-");

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Live mode setup</h2>
        <p className="text-sm text-slate-600 mt-1">
          Paste a call script and your own Anthropic API key. Each customer line will be sent to the
          real Claude API for analysis — exactly the way the production version would work.
        </p>
      </div>

      <section>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
          Call script
        </label>
        <p className="text-xs text-slate-500 mb-2">
          One message per line. Prefix lines with <code className="text-[11px] bg-slate-100 px-1 py-0.5 rounded">agent:</code> or <code className="text-[11px] bg-slate-100 px-1 py-0.5 rounded">customer:</code> to set the speaker. Unprefixed lines default to <em>customer</em>.
        </p>
        <textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          rows={14}
          className="w-full font-mono text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="agent: Hello, thanks for calling…&#10;customer: I need help with my account…"
        />
        <div className="text-xs text-slate-500 mt-1">{lineCount} message{lineCount === 1 ? "" : "s"} parsed</div>
      </section>

      <section>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
          Anthropic API key
        </label>
        <div className="flex gap-2">
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            autoComplete="off"
            spellCheck={false}
            className="flex-1 font-mono text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="button"
            onClick={() => setShowKey((s) => !s)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
          >
            {showKey ? "Hide" : "Show"}
          </button>
        </div>
        <div className="text-xs text-slate-500 mt-1.5 leading-relaxed">
          Your key is sent only with each analysis request and is <strong>not stored anywhere</strong> —
          not in the browser, not on the server, not in logs. Refreshing the page wipes it.
          Get a key at{" "}
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noreferrer"
            className="text-brand-600 underline"
          >
            console.anthropic.com
          </a>.
        </div>
      </section>

      <div className="pt-2">
        <button
          onClick={() => onStart(script, apiKey.trim())}
          disabled={!canStart}
          className="px-4 py-2 text-sm font-medium rounded-md bg-brand-600 text-white hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          Start live call
        </button>
        {!canStart && (
          <span className="ml-3 text-xs text-slate-500">
            {lineCount === 0
              ? "Paste a script to continue."
              : "Paste a valid Anthropic API key (starts with sk-) to continue."}
          </span>
        )}
      </div>
    </div>
  );
}
