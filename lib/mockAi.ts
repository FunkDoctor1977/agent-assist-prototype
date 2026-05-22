export type AgentInsight = {
  lineId: number;
  intent: string;
  sentiment: "positive" | "neutral" | "negative" | "frustrated" | "at-risk";
  escalationRisk: "low" | "medium" | "high";
  suggestedResponse: string;
  kbSnippets: { title: string; excerpt: string }[];
};

// Hand-crafted insights matched to each customer line in mockTranscript.
// In the wired-up version, this is replaced by a single Claude API call per line.
// The shape of this output is identical to what the LLM would return, so the
// front-end consumes it the same way either way.
export const mockInsights: Record<number, AgentInsight> = {
  2: {
    lineId: 2,
    intent: "Account access — locked out of online account",
    sentiment: "neutral",
    escalationRisk: "low",
    suggestedResponse:
      "Apologise for the inconvenience and ask for the account number or email so you can pull the account up.",
    kbSnippets: [
      {
        title: "KB-118 · Account lockout — first-line checks",
        excerpt:
          "Confirm identity, check lockout state in Identity Console, verify whether the customer is on the legacy SSO realm.",
      },
    ],
  },
  4: {
    lineId: 4,
    intent: "Password reset failing — email not recognised",
    sentiment: "negative",
    escalationRisk: "medium",
    suggestedResponse:
      "Acknowledge the repeated attempts, reassure the customer, and check whether the email is on the legacy login database before initiating a manual reset.",
    kbSnippets: [
      {
        title: "KB-204 · Legacy login migration",
        excerpt:
          "Customers created before the 2023 platform migration may sit on the legacy realm. Use the Migrate-User action in the back-office tool before triggering a password reset.",
      },
      {
        title: "KB-067 · Manual password reset procedure",
        excerpt:
          "Verify identity with two security questions, then issue a temporary password via the email of record. Customer must change on first login.",
      },
    ],
  },
  6: {
    lineId: 6,
    intent: "Repeat caller — frustration with unresolved issue",
    sentiment: "frustrated",
    escalationRisk: "high",
    suggestedResponse:
      "Validate the customer's frustration explicitly. Commit to resolving in this call. Avoid asking the customer to repeat themselves.",
    kbSnippets: [
      {
        title: "KB-001 · De-escalation language pack",
        excerpt:
          '"I completely understand", "I\'m going to take ownership of this", "Here\'s exactly what I\'m going to do next".',
      },
    ],
  },
  8: {
    lineId: 8,
    intent: "Churn threat — considering switching provider",
    sentiment: "at-risk",
    escalationRisk: "high",
    suggestedResponse:
      "Acknowledge the threat without arguing. Reaffirm ownership. Offer a concrete next action with a specific outcome and timeframe.",
    kbSnippets: [
      {
        title: "KB-330 · Retention triggers",
        excerpt:
          "Customer explicitly mentions a competitor or switching: flag account as at-risk in CRM, offer a goodwill credit (up to £25) within front-line discretion.",
      },
    ],
  },
  10: {
    lineId: 10,
    intent: "Confirmation — conditional on data preservation",
    sentiment: "neutral",
    escalationRisk: "medium",
    suggestedResponse:
      "Confirm explicitly that billing history is preserved through the migration. Reassure that no data is lost.",
    kbSnippets: [
      {
        title: "KB-204 · Legacy login migration — data preservation",
        excerpt:
          "Migration is non-destructive: all invoices, payment history, and saved payment methods are carried across automatically.",
      },
    ],
  },
};
