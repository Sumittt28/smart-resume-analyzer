import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Resume Analyzer",
  description: "ATS-style Smart Resume Analyzer built with Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
