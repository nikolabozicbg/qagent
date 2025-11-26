"use client";

import { useEffect, useState } from "react";

interface Particle {
  x: number;
  y: number;
  id: number;
  opacity: number;
}

export default function CursorTrail() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let particleId = 0;
    let timeout: NodeJS.Timeout;

    const handleMouseMove = (e: MouseEvent) => {
      setIsVisible(true);
      clearTimeout(timeout);
      
      const newParticle: Particle = {
        x: e.clientX,
        y: e.clientY,
        id: particleId++,
        opacity: 1,
      };

      setParticles((prev) => [...prev.slice(-8), newParticle]);

      timeout = setTimeout(() => {
        setIsVisible(false);
      }, 100);
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Fade out particles
    const fadeInterval = setInterval(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({ ...p, opacity: p.opacity - 0.05 }))
          .filter((p) => p.opacity > 0)
      );
    }, 50);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearInterval(fadeInterval);
      clearTimeout(timeout);
    };
  }, []);

  if (!isVisible && particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {particles.map((particle, index) => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 blur-sm"
          style={{
            left: particle.x,
            top: particle.y,
            opacity: particle.opacity,
            transform: `translate(-50%, -50%) scale(${1 - index * 0.1})`,
            transition: "opacity 0.3s ease-out",
          }}
        />
      ))}
    </div>
  );
}
