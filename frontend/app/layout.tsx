import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SHL Assessment Advisor",
  description: "AI-powered SHL assessment recommendation assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-shl-dark-bg text-shl-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
