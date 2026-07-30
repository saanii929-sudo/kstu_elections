import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import ChatbotWidget from "@/components/chatbot-widget";
import VisitorTracker from "@/components/VisitorTracker";
import DisableInspect from "@/components/DisableInspect";
import DevToolsGuard from "@/components/DevToolsGuard";

// Using system fonts as fallback to avoid Google Fonts connection issues during build
const geistSans = {
  variable: "--font-geist-sans",
};

const geistMono = {
  variable: "--font-geist-mono",
};


export const metadata: Metadata = {
  verification: {
    google: "z0c-IsbG7lVZ19I_I4t1EuQmOq-GrcYfzIQJjDVzJjw",
  },
  title: "KsTU E-Voting",
  description: "A simple and transparent voting experience",
  icons: {
    icon: [
      { url: "/images/logo.png", type: "image/png" },
    ],
    shortcut: "/images/logo.png",
    apple: "/images/logo.png",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <VisitorTracker />
        {children}
      </body>
    </html>
  );
}