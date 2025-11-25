import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FeedbackButton from "@/components/FeedbackButton";
import FloatingWaitlistButton from "@/components/FloatingWaitlistButton";
import ScrollProgressBar from "@/components/ScrollProgressBar";

export const metadata: Metadata = {
  title: 'QAgenAI - AI Agent for Test Generation',
  description: 'Generate tests 10x faster with AI. Coverage gap detection, self-healing tests. Available as VS Code Extension or MCP Server.',
  openGraph: {
    title: 'QAgenAI - AI Agent for Test Generation',
    description: 'Generate tests 10x faster with AI. Coverage gap detection, self-healing tests.',
    url: 'https://qagenai.com',
    siteName: 'QAgenAI',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'QAgenAI - AI Agent for Test Generation',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'QAgenAI - AI Agent for Test Generation',
    description: 'Generate tests 10x faster with AI',
    images: ['/og-image.png'],
  },
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
        <FloatingWaitlistButton />
        <ScrollProgressBar />
        <Toaster />
      </body>
    </html>
  );
}
