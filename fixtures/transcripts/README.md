# Test Call Transcripts

Three diverse disgruntled-customer scenarios for testing Agent Assist Live Mode. Each one is hand-written to exercise the sentiment / escalation arc the AI sidebar is designed to detect.

## How to use

1. Open the app at http://localhost:3000 (or the deployed URL)
2. Switch to **Live mode** (top-right toggle)
3. Open one of the files below, copy the whole contents
4. Paste into the **"Call script"** textarea on the Live mode setup screen
5. Paste your Anthropic API key
6. Click **Start live call**

## Scenarios

| File | Vertical | What it tests |
|------|----------|---------------|
| [`01-telco-service-outage.txt`](01-telco-service-outage.txt) | Telecoms | Repeat caller, broken promises, churn threat, compensation expectation |
| [`02-banking-card-blocked.txt`](02-banking-card-blocked.txt) | Retail banking | Customer in distress, IVR frustration, fraud-block context, comparison-shop competitor mention |
| [`03-insurance-claim-denied.txt`](03-insurance-claim-denied.txt) | Home insurance | Long-standing policyholder, claim denial, Ombudsman threat, evidence-based de-escalation opportunity |

## Sentiment arc you should expect

All three transcripts are designed to take the sidebar through:

```
neutral → negative → frustrated → at-risk → (sometimes) de-escalating
```

Watch the **Sentiment** chip and **Escalation risk** dot in the sidebar move through these states as the call progresses. The **Suggested response** should adapt — softer language in the early lines, explicit ownership and concrete commitments by the time the customer raises a churn or Ombudsman threat.

## A note on testing without burning API credit

You can use these scripts in **Demo mode** too — paste them as-is into the Live setup, but **don't paste an API key**. The "Start live call" button stays disabled, but you can verify the script parses correctly (line count shown). To see the actual sentiment classification you'll need to flip to Live with a valid key.

For zero-cost pre-flight checks of the rest of the app (KB upload, multi-agent panel layout, error rendering), see [TESTING.md](../../TESTING.md) at the repo root.
