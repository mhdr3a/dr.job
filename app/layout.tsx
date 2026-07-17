import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DR.Job — Discover Your Next Role",
  description: "AI-powered career discovery and job matching",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full text-gray-900 antialiased">{children}</body>
    </html>
  );
}
