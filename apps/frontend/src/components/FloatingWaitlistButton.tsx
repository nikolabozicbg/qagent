"use client";

import { useState, useEffect } from "react";
import { Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmailWaitlist from "@/components/EmailWaitlist";

export default function FloatingWaitlistButton() {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show FAB after scrolling 500px
      setVisible(window.scrollY > 500);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full p-4 shadow-2xl hover:scale-110 hover:shadow-purple-500/50 transition-all duration-300 ${
          visible ? "animate-on-scroll" : ""
        }`}
        aria-label="Join Waitlist"
      >
        {open ? (
          <X className="w-6 h-6" />
        ) : (
          <Mail className="w-6 h-6" />
        )}
      </button>

      {/* Popup Modal */}
      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-96 max-w-[calc(100vw-3rem)] animate-on-scroll">
          <EmailWaitlist 
            variant="hero"
            title="Join the Waitlist"
            subtitle="Get early access when we launch"
          />
        </div>
      )}
    </>
  );
}
