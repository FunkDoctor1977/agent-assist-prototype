import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Assist Prototype — Asim AI Lab",
  description:
    "Real-time AI co-pilot for contact-centre agents. Live intent detection, sentiment, and suggested responses.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
