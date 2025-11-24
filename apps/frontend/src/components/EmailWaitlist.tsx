"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔍 Debug: handleSubmit called');
    console.log('🔍 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }

    setLoading(true);
    console.log('🔍 Email:', email);

    try {
      // Insert email into Supabase
      console.log('🔍 Calling Supabase insert...');
      const { data, error } = await supabase
        .from('waitlist')
        .insert([{ email }])
        .select();

      if (error) {
        // Check if email already exists
        if (error.code === '23505') {
          toast.info("You're already on the waitlist!", {
            description: "We'll notify you when Pro launches."
          });
          setSubmitted(true);
          return;
        }
        throw error;
      }

      setSubmitted(true);
      toast.success("You're on the list!", {
        description: "We'll notify you when Pro launches with your exclusive discount."
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
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-lg border border-emerald-500/20">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-sm font-medium">You're on the waitlist!</span>
        </div>
      </div>
    );
  }

  if (variant === "hero") {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-5 h-5 text-purple-400" />
            <h3 className="font-semibold text-lg text-white">{title}</h3>
          </div>
          <p className="text-sm text-slate-400 mb-4">{subtitle}</p>
          
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500"
              disabled={loading}
            />
            <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-500 w-full sm:w-auto">
              {loading ? "Joining..." : "Notify Me"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 max-w-sm mx-auto">
      <Input
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 bg-slate-800 border-slate-700 focus:border-purple-500 text-sm"
        disabled={loading}
      />
      <Button 
        type="submit" 
        disabled={loading} 
        className="bg-purple-600 hover:bg-purple-500 text-white"
      >
        {loading ? "..." : "Join"}
      </Button>
    </form>
  );
}
