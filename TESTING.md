# Agent Assist — Test Plan

A pre-flight checklist for exercising every feature before going live in front of a recruiter or hiring manager. Most of this you can run without spending any API credit — only the Live-mode tests require a valid Anthropic API key.

## 0. Setup

| | |
|---|---|
| URL | http://localhost:3000 |
| Default mode on first load | Demo |
| Optional API key | Get one at https://console.anthropic.com/settings/keys (Haiku 4.5 costs ~fractions of a penny per call) |
| Sample transcripts | [`fixtures/transcripts/`](fixtures/transcripts/) |

If the dev server isn't running:

```powershell
cd "C:\Users\asims\Build Lab test\agent-assist-prototype"
npm run dev
```

---

## 1. Demo mode — canned scenario (zero cost)

**Goal:** Verify the baseline flow works end-to-end without any AI calls.

| # | Step | Expected |
|---|------|----------|
| 1.1 | Land on http://localhost:3000 | Header shows *Demo* toggle highlighted blue. Sidebar shows the *Demo · canned data* badge. |
| 1.2 | Click **Start call** | First agent line appears immediately. New lines appear every 3.5s. |
| 1.3 | Watch the right sidebar after the first **customer** line | Loading skeleton briefly visible, then *Customer intent · Sentiment · Escalation risk · Suggested response · Knowledge base* sections populate. |
| 1.4 | Continue through the call (Northwind support scenario) | By line 6 sentiment should be "frustrated", by line 8 "at-risk" with a red escalation dot. |
| 1.5 | Click **Pause** mid-call | Streaming stops. Sidebar keeps the last insight visible. |
| 1.6 | Click **Resume** | Streaming continues from where it stopped. |
| 1.7 | Reach the last line, click **Start call** again | Transcript resets and replays. |
| 1.8 | Click **Reset** at any point | Transcript clears, sidebar returns to its empty state. |

**Watch for:** any flicker on insight transitions, broken sentiment chip colour mapping, KB snippets failing to render.

---

## 2. Knowledge Base (KB) — zero cost

**Goal:** Verify the RAG pipeline ingests files, embeds them, and retrieves relevant snippets.

| # | Step | Expected |
|---|------|----------|
| 2.1 | Click the **📚 KB** button in the header | Drawer slides in from the right. Default state: *"No documents yet."* |
| 2.2 | Drag-and-drop a small `.txt` or `.md` file into the drop zone | "Embedding…" shows briefly. **First upload** may take ~30s while the ~25MB embedding model downloads. Subsequent uploads are <2s. |
| 2.3 | After upload completes | Doc appears in the list with chunk count and approx tokens. Header *📚 KB* button shows a green chunk-count badge. |
| 2.4 | Try a **PDF** file (e.g. one of your own docs) | Text extracted, chunked, embedded. Same UX as text. |
| 2.5 | Try a **DOCX** file | Same. |
| 2.6 | Try an unsupported extension (e.g. `.png`) | Red error: *"Unsupported file type"*. |
| 2.7 | Upload several files | List grows. Total chunks count updates. |
| 2.8 | Click the **×** next to a single doc | That doc is removed; total chunks drops by that doc's count. |
| 2.9 | Click **Clear all** | All docs removed; total chunks back to zero; header badge disappears. |
| 2.10 | Close the drawer (× or click outside) | Drawer slides out; state preserved. |

**Watch for:** the first-time model download is the slowest moment — if you're demoing live, **upload one file before the demo starts** so the model is already cached.

---

## 3. RAG in Demo mode — zero cost

**Goal:** Confirm retrieved chunks replace the canned KB snippets when KB has content.

| # | Step | Expected |
|---|------|----------|
| 3.1 | Upload any text-rich document via the KB drawer | Header chunk-count badge shows >0 |
| 3.2 | Run a demo call from step 1.2 | Sidebar header now shows a purple **RAG** badge alongside the *Demo · canned data* badge. |
| 3.3 | Watch the **Knowledge base** section in the sidebar | Titles now read like `your-file.pdf · chunk 2` instead of `KB-204 · Legacy login migration`. Excerpts are the actual text of the matched chunks. |
| 3.4 | Empty the KB (Clear all) and run the call again | KB section reverts to canned `KB-001`, `KB-204`-style titles. |

**Watch for:** if a chunk's similarity score is below the 0.25 threshold, you'll see fewer or zero snippets. That's correct behaviour, not a bug — try uploading content more semantically related to a contact-centre context.

---

## 4. Live mode setup — zero cost (until you click Start)

**Goal:** Verify form validation and the API-key flow.

| # | Step | Expected |
|---|------|----------|
| 4.1 | Click the **Live (BYO API key)** toggle | Setup screen renders. A pre-filled example script is shown. |
| 4.2 | Empty the script textarea | "Start live call" button stays disabled. Hint: *"Paste a script to continue."* |
| 4.3 | Paste a script but leave the API key blank | "Start live call" stays disabled. Hint: *"Paste a valid Anthropic API key (starts with sk-) to continue."* |
| 4.4 | Type an obviously bad key like `not-a-real-key` | Button stays disabled (input is validated to start with `sk-`). |
| 4.5 | Paste a real key starting with `sk-` | Button becomes enabled. |
| 4.6 | Toggle the **Show / Hide** button | Key toggles between password-mask and plain text. |
| 4.7 | Watch the **lines parsed** counter under the textarea | Updates as you type. Matches the non-blank line count. |

**Watch for:** scripts with non-standard prefixes are still parsed — unprefixed lines default to *customer*, which is intentional.

---

## 5. Live mode — full happy path (~$0.005 per call)

**Goal:** Verify Claude is actually being called, multi-agent pipeline visible, errors surfaced cleanly.

| # | Step | Expected |
|---|------|----------|
| 5.1 | Pick a transcript from `fixtures/transcripts/` (e.g. `01-telco-service-outage.txt`), paste it, paste your key, click **Start live call** | Setup screen disappears; you land on the standard transcript view. |
| 5.2 | Hit **Start call** | Lines stream as in Demo mode. |
| 5.3 | Sidebar header in Live mode | Green pulsing **Live · Claude API** badge replaces the *Demo · canned data* badge. |
| 5.4 | After the first customer line, watch the sidebar | At the top: purple **MULTI-AGENT PIPELINE** panel with rows for KB Retrieval (if KB active), Intent, Sentiment, Guidance. Each row shows status dot + model + latency in ms. |
| 5.5 | Inspect the Intent / Sentiment / Suggested response sections | These now reflect Claude's actual analysis of *that specific* transcript — not the canned demo content. |
| 5.6 | Compare three sub-agent latencies | Total time should be close to the slowest single agent, not the sum (because they run in parallel). Typical: each agent 400-900ms, total 700-1100ms. |
| 5.7 | Trigger a sentiment transition (line 6 onwards of telco script) | Sentiment chip should shift to *frustrated* or *at-risk*; suggested response should mention ownership / de-escalation. |
| 5.8 | Click **Edit script** in the header | Returns to Live-mode setup, transcript discarded. |

**Watch for:** the first call after the dev server boots is ~2-3s slower due to JIT compilation in the API route — subsequent calls are normal.

---

## 6. Live mode + KB — RAG-grounded multi-agent (~$0.005 per call)

**Goal:** The full pipeline: vector retrieval feeds the Guidance sub-agent.

| # | Step | Expected |
|---|------|----------|
| 6.1 | Upload a domain-relevant document via the KB drawer (e.g. a contact-centre KB article, an incident response runbook, even a related blog post saved as .pdf) | Header badge updates |
| 6.2 | Switch to Live mode, paste a script that references the same domain, paste key, Start | Pipeline panel now shows 4 rows: KB Retrieval + Intent + Sentiment + Guidance. |
| 6.3 | Watch the Guidance row | Name changes to **"Guidance (RAG-grounded)"** — the sub-agent has been given the retrieved chunks. |
| 6.4 | Check the **Knowledge base** section at the bottom of the sidebar | Real chunks from your uploaded doc, verbatim. Titles include the filename. |
| 6.5 | Review the suggested response | Should reference or echo language from your KB content rather than generic advice. |

**Demoable talking point:** *"This is real RAG — the Guidance sub-agent's prompt includes the top-K vector-retrieved chunks from the operator's own KB. The snippets shown to the user are the actual chunks, not LLM hallucinations. If retrieval fails, the agent degrades gracefully."*

---

## 7. Error handling

| # | Scenario | How to trigger | Expected |
|---|----------|---------------|----------|
| 7.1 | Invalid API key | Paste `sk-ant-invalid-12345` | Sidebar shows red error box: *"Claude API error: …authentication…"* with HTTP 401. Multi-agent panel still renders (showing red status dots). |
| 7.2 | No key | Hit Start with the field empty | Button is disabled — can't get past form validation. |
| 7.3 | Empty script | Delete script, try to start | Button disabled. |
| 7.4 | Network blip mid-call | Disconnect Wi-Fi mid-streaming, wait for next customer line | Red error in the sidebar; subsequent reconnection recovers cleanly. |
| 7.5 | Unsupported KB file | Try uploading a `.zip` | Red "Upload error" box inside the KB drawer. |
| 7.6 | Very large KB file | Upload a 5MB+ PDF | Embedding takes longer (10-30s) but should succeed. Watch the upload spinner. |

---

## 8. Demo → Live transition

| # | Step | Expected |
|---|------|----------|
| 8.1 | Run a demo call halfway, then click **Live (BYO API key)** | Transcript resets, you land on Live setup. |
| 8.2 | Run a live call halfway, then click **Demo** | Transcript resets, returns to the canned Northwind scenario. |
| 8.3 | Live → click **Edit script** mid-call | Returns to live setup; transcript and API key state preserved? (it isn't — script returns to the default in the editor; this is intentional, lets you switch scenarios cleanly) |

---

## 9. What to prepare before a recruiter demo

1. **Open the app fresh.** First-load is slowest.
2. **Upload one KB file ahead of time** so the embedding model is already cached. Pick something relevant to the vertical you're discussing.
3. **Pick the transcript that matches the vertical the recruiter works in.**
4. **Have your API key ready** in a password manager — don't fish for it on the call.
5. **Practise the talk-through once.** Common points to make:
   - *"Demo mode runs from canned data — proves the UI works without burning API."*
   - *"Live mode hands the whole pipeline over to Claude — interviewer can paste their own script."*
   - *"RAG is real vector retrieval against locally-embedded uploads, not prompt-stuffing."*
   - *"Multi-agent is parallel — three focused Claude calls running concurrently, each with its own single-task prompt."*
