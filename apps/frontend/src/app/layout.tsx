import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FeedbackButton from "@/components/FeedbackButton";

export const metadata: Metadata = {
  title: 'QAgent - AI Test Generation',
  description: 'Autonomous AI Agent for QA - Generate test suites in seconds',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Plausible Analytics */}
        <Script
          async
          src="https://plausible.io/js/pa-ugJ_gS0d8XBcybgan-XqW.js"
          strategy="afterInteractive"
        />
        <Script id="plausible-init" strategy="afterInteractive">
          {`
            window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};
            plausible.init()
          `}
        </Script>
      </head>
      <body>
        <Navbar />
        <main className="min-h-screen">
          {children}
        </main>
        <Footer />
        <FeedbackButton />
        <Toaster />
      </body>
    </html>
  );
}
