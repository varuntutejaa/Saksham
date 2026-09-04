import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Saksham — PM-AJAY Skilling Assistant",
  description:
    "AI-driven voice assistant for livelihood mapping and NSQF-aligned skilling recommendations for SC communities under PM-AJAY. Ministry of Social Justice & Empowerment.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
