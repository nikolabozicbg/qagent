"use client";

import { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, CheckCircle2, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/Skeleton";

interface EmailWaitlistProps {
  variant?: "hero" | "inline";
  title?: string;
  subtitle?: string;
}

export default function EmailWaitlist({ 
  variant = "inline",
  title = "Get 50% off Pro at launch",
  subtitle = "Join the waitlist for early access and exclusive discount"
}: EmailWaitlistProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);

  // Fetch waitlist count on mount
  useEffect(() => {
    async function fetchCount() {
      try {
        const { count, error } = await supabase
          .from('waitlist')
          .select('*', { count: 'exact', head: true });
        
        if (!error && count !== null) {
          setWaitlistCount(count);
        }
      } catch (err) {
        console.error('Failed to fetch waitlist count:', err);
      }
    }
    fetchCount();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('waitlist')
        .insert([{ email }])
        .select();

      if (error) {
        // Check if email already exists
        if (error.code === '23505') {
          toast.info("You're already on the waitlist!", {
            description: "We'll notify you when QAgenAI launches."
          });
          setSubmitted(true);
          return;
        }
        throw error;
      }

      setSubmitted(true);
      // Update count
      if (waitlistCount !== null) {
        setWaitlistCount(waitlistCount + 1);
      }
      
      // Confetti celebration!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#ec4899', '#8b5cf6']
      });
      
      toast.success("You're on the list!", {
        description: "We'll notify you the moment QAgenAI launches. No spam, ever."
      });
    } catch (err: any) {
      console.error('Supabase error:', err);
      toast.error("Something went wrong", {
        description: err.message || "Please try again later."
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center justify-center animate-in fade-in duration-500">
        <div className="flex items-center gap-3 bg-emerald-500/10 text-emerald-400 px-6 py-3 rounded-lg border border-emerald-500/30 shadow-lg">
          <CheckCircle2 className="w-5 h-5" />
          <div>
            <div className="font-semibold">You're on the waitlist!</div>
            <div className="text-xs text-emerald-400/80">We'll email you when we launch</div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "hero") {
    return (
      <div className="max-w-md mx-auto">
        <div className="relative bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl hover:border-purple-500/50 transition-all duration-300 card-tilt">
          
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-purple-400" />
              <h3 className="font-semibold text-lg text-white">{title}</h3>
            </div>
          </div>
          <p className="text-sm text-slate-400 mb-5">{subtitle}</p>
          
          {/* Trust signals - ABOVE form */}
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Free for solo devs
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Launch Q1 2026
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              No credit card
            </span>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 h-12 text-base"
              disabled={loading}
              required
              autoComplete="email"
            />
            <Button 
              type="submit" 
              disabled={loading || !email} 
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:cursor-not-allowed h-12 text-base font-semibold shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Joining...</span>
                </span>
              ) : "Get Early Access"}
            </Button>
          </form>
          
          {/* Social proof + Progress - BELOW form */}
          {waitlistCount === null ? (
            <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
              <div className="flex items-center justify-center gap-2">
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          ) : waitlistCount > 10 ? (
            <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm">
                <Users className="w-4 h-4 text-purple-400" />
                <span className="text-slate-300">
                  Join <strong className="text-purple-400 text-base">{waitlistCount}</strong> developers already on the waitlist
                </span>
              </div>
              
              {/* Progress Bar */}
              {waitlistCount < 500 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{waitlistCount} signups</span>
                    <span>500 goal</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min((waitlistCount / 500) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-center text-slate-500">
                    {Math.round((waitlistCount / 500) * 100)}% to launch goal
                  </p>
                </div>
              )}
            </div>
          ) : null}
          
          {/* Urgency (optional - only show if count is high) */}
          {waitlistCount !== null && waitlistCount < 500 && waitlistCount > 50 && (
            <div className="mt-3 text-center">
              <p className="text-xs text-orange-400/80">
                🚀 First 500 signups get lifetime launch discount
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Inline variant
  return (
    <div className="max-w-xl mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <Input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 bg-slate-900 border-slate-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 h-12 text-base"
          disabled={loading}
          required
          autoComplete="email"
        />
        <Button 
          type="submit" 
          disabled={loading || !email}
          className="bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 h-12 px-8 text-base font-semibold w-full sm:w-auto"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Joining...</span>
            </span>
          ) : "Get Early Access"}
        </Button>
      </form>
      
      {/* Social proof + trust for inline */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-500">
        {waitlistCount !== null && waitlistCount > 10 && (
          <>
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-purple-400" />
              <span><strong className="text-purple-400">{waitlistCount}</strong> developers waiting</span>
            </span>
            <span className="text-slate-700">•</span>
          </>
        )}
        <span>Free for solo devs</span>
        <span className="text-slate-700">•</span>
        <span>Launch Q1 2026</span>
      </div>
    </div>
  );
}
