export type TranscriptLine = {
  id: number;
  speaker: "customer" | "agent";
  text: string;
};

export const mockTranscript: TranscriptLine[] = [
  { id: 1, speaker: "agent", text: "Good afternoon, you've reached Northwind Support, my name is Sarah. How can I help today?" },
  { id: 2, speaker: "customer", text: "Hi Sarah, I'm trying to get into my online account but it keeps locking me out." },
  { id: 3, speaker: "agent", text: "I'm sorry to hear that. Can I take your account number or the email on file?" },
  { id: 4, speaker: "customer", text: "Yeah it's james.miller@gmail.com. I've tried resetting the password three times now and it's saying my email isn't recognised." },
  { id: 5, speaker: "agent", text: "Let me have a quick look for you. One moment." },
  { id: 6, speaker: "customer", text: "This is the second time this week I've had to call. I'm getting really frustrated, I just want to pay my bill." },
  { id: 7, speaker: "agent", text: "I completely understand, I'll do everything I can to get this sorted in this call." },
  { id: 8, speaker: "customer", text: "If this doesn't get fixed today I'm going to have to look at moving providers, honestly." },
  { id: 9, speaker: "agent", text: "I hear you, and I don't want it to come to that. I can see your account is on a legacy login system — let me migrate it across and reset it from my side." },
  { id: 10, speaker: "customer", text: "Okay, please. As long as I don't lose my billing history." },
];
