import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ViewportHeight from '../components/ViewportHeight';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Flowminder App",
  description: "Manage flow of conversations wth Flowminder",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ViewportHeight />
        {children}
      </body>
    </html>
  );
}
