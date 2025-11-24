"use client";

import { MessageCircle } from "lucide-react";

export default function FeedbackButton() {
  return (
    <a 
      href="mailto:feedback@qagenai.com?subject=QAgenAI Feedback&body=Hi! Here's my feedback:%0D%0A%0D%0A"
      className="fixed bottom-6 right-6 bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-500 transition-all hover:scale-110 z-50 group"
      title="Send Feedback"
    >
      <MessageCircle className="w-6 h-6" />
      <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-sm px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        Send Feedback
      </span>
    </a>
  );
}
