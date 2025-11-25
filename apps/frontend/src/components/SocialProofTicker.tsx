"use client";

import { useState, useEffect } from "react";
import { Users } from "lucide-react";

const mockSignups = [
  { name: "Alex M.", location: "San Francisco" },
  { name: "Sarah K.", location: "London" },
  { name: "John D.", location: "New York" },
  { name: "Maria G.", location: "Berlin" },
  { name: "David L.", location: "Tokyo" },
  { name: "Emma R.", location: "Sydney" },
];

export default function SocialProofTicker() {
  const [visible, setVisible] = useState(false);
  const [currentSignup, setCurrentSignup] = useState(mockSignups[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      
      setTimeout(() => {
        const randomSignup = mockSignups[Math.floor(Math.random() * mockSignups.length)];
        setCurrentSignup(randomSignup);
        setVisible(true);
      }, 500);
    }, 8000);

    // Show first one after 3 seconds
    setTimeout(() => setVisible(true), 3000);

    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-6 z-40 animate-on-scroll">
      <div className="glass rounded-lg p-4 shadow-2xl border border-purple-500/30 max-w-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">
              {currentSignup.name} just joined!
            </div>
            <div className="text-xs text-slate-400">{currentSignup.location}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
