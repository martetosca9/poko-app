import type { Metadata } from "next";
import { Share_Tech_Mono, VT323 } from "next/font/google";
import "./globals.css";

const shareTechMono = Share_Tech_Mono({
  variable: "--font-share-tech-mono",
  subsets: ["latin"],
  weight: "400",
});

const vt323 = VT323({
  variable: "--font-vt323",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Poko",
  description: "Poko app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${shareTechMono.variable} ${vt323.variable} antialiased`}
        style={{ fontFamily: "var(--font-share-tech-mono), monospace" }}
      >
        {children}
      </body>
    </html>
  );
}