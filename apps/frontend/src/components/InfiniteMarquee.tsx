"use client";

interface MarqueeItem {
  text: string;
  author?: string;
}

interface InfiniteMarqueeProps {
  items: MarqueeItem[];
  speed?: number;
}

export default function InfiniteMarquee({ items, speed = 50 }: InfiniteMarqueeProps) {
  return (
    <div className="relative overflow-hidden bg-slate-900/30 border-y border-slate-800 py-4">
      <div className="flex animate-marquee whitespace-nowrap">
        {[...items, ...items].map((item, i) => (
          <div
            key={i}
            className="inline-flex items-center gap-2 mx-8 text-slate-300"
          >
            <span className="text-2xl">⭐</span>
            <span className="text-sm">"{item.text}"</span>
            {item.author && (
              <span className="text-xs text-slate-500">- {item.author}</span>
            )}
            <span className="text-slate-700">•</span>
          </div>
        ))}
      </div>
      
      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        .animate-marquee {
          animation: marquee ${speed}s linear infinite;
        }
      `}</style>
    </div>
  );
}
