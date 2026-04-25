import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JobTracker AI — Command Your Job Hunt",
  description:
    "AI-powered job application tracker with Gmail integration. Automated insights, offer probability scoring, and strategic action queues.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
