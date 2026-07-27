import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import ChatbotWidget from "@/components/chatbot-widget";
import VisitorTracker from "@/components/VisitorTracker";

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
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#333',
              padding: '16px',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            },
            success: {
              iconTheme: {
                primary: '#16a34a',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#dc2626',
                secondary: '#fff',
              },
            },
          }}
        />
        <VisitorTracker />
        {children}
      </body>
    </html>
  );
}