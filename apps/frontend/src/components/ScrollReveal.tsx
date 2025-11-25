'use client';

import { useScrollAnimation } from '@/hooks/useScrollAnimation';

interface ScrollRevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export function ScrollReveal({ children, delay = 0, className = '' }: ScrollRevealProps) {
  const { ref, isVisible } = useScrollAnimation(0.1);

  return (
    <div
      ref={ref}
      className={`animate-fade-in-blur ${isVisible ? 'visible' : ''} ${className}`}
      style={{
        animationDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
