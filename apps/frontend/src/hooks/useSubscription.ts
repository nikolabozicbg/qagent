"use client";

import { useEffect, useState } from "react";

/**
 * MOCK subscription state for MVP.
 * Change isPro to true for demo mode.
 */
export function useSubscription() {
  const [isPro] = useState(true); // Change to true for Pro demo - ENABLED FOR TESTING
  return { isPro };
}

/**
 * FREE USAGE LIMIT → 3 generations/day
 * Uses localStorage (client-side only)
 */
export function useUsageLimit() {
  const MAX_FREE = 3;
  const KEY = "qagent_usage";

  const [count, setCount] = useState(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    if (typeof window === "undefined") return;

    const today = new Date().toDateString();
    const saved = JSON.parse(localStorage.getItem(KEY) || "{}");

    if (saved.date === today) {
      setCount(saved.count || 0);
    } else {
      localStorage.setItem(KEY, JSON.stringify({ date: today, count: 0 }));
      setCount(0);
    }
  }, []);

  const increment = () => {
    if (typeof window === "undefined") return;

    const today = new Date().toDateString();
    const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    const newCount = (saved.count || 0) + 1;

    localStorage.setItem(KEY, JSON.stringify({ date: today, count: newCount }));
    setCount(newCount);
  };

  const canUse = count < MAX_FREE;

  return { count, MAX_FREE, increment, canUse, isClient };
}
