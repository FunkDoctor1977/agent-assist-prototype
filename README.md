# Agent Assist Prototype

**An Asim AI Lab project** · Real-time AI co-pilot for contact-centre agents.

## What it does

A small web application that simulates a live customer-service call. As the customer's audio is transcribed line-by-line, an AI sidebar surfaces in real time:

- **Customer intent** — what is the caller actually asking for?
- **Sentiment & escalation flag** — is the customer getting frustrated?
- **Suggested agent response** — a draft the agent can edit and read aloud.
- **Relevant knowledge-base snippets** — grounded answers, not hallucinations.

Designed as a vendor-agnostic demonstration of the Agent Assist pattern shipped by Five9, Genesys Cloud CX, NICE CXone, and Cisco Webex Contact Center.

## Why this project

I spent over a decade delivering contact-centre and unified-communications platforms at Cisco, Vodafone, BT, and Telefónica Tech. At Telefónica I supported the introduction of Five9's Agent Assist GenAI features. This prototype takes that hands-on contact-centre domain knowledge and combines it with modern LLM tooling to demonstrate the pattern end-to-end.

It is intentionally a **prototype**, not a production system — built to make the architecture concrete, demo the user experience, and provide a sharp talking point in conversations with CCaaS vendors and consultancies.

## Status

🚧 v0.1 in progress · README-first scaffold.

## Roadmap

- [ ] v0.1 — Scaffold UI (Next.js) with a fake transcript player
- [ ] v0.2 — Wire Claude API for intent + suggested response
- [ ] v0.3 — Add a small JSON knowledge base + retrieval
- [ ] v0.4 — Sentiment / escalation flag
- [ ] v0.5 — Deploy to Vercel + record demo Loom

## Stack

Next.js · TypeScript · Anthropic Claude API · Tailwind · Vercel

## Author

Asim Shahzad · [LinkedIn](https://linkedin.com/in/asim-shahzad-82183b2) · Birmingham, UK
