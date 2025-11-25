'use client';

import { Bot, Zap, Shield, LineChart, Code2, Sparkles } from 'lucide-react';

const features = [
  {
    icon: Bot,
    title: 'AI-Powered Analysis',
    description: 'Scans your codebase and identifies untested paths automatically',
    gradient: 'from-purple-500 to-pink-500',
    size: 'large', // spans 2 columns
  },
  {
    icon: Zap,
    title: 'Instant Generation',
    description: 'Generate complete test suites in seconds, not hours',
    gradient: 'from-blue-500 to-cyan-500',
    size: 'small',
  },
  {
    icon: Shield,
    title: 'Self-Healing Tests',
    description: 'Tests auto-update when code changes, no more maintenance hell',
    gradient: 'from-green-500 to-emerald-500',
    size: 'small',
  },
  {
    icon: LineChart,
    title: 'Coverage Gap Detection',
    description: 'See exactly what\'s missing and get tests for those gaps',
    gradient: 'from-orange-500 to-red-500',
    size: 'medium',
  },
  {
    icon: Code2,
    title: 'Framework Aware',
    description: 'Supports Jest, Vitest, Playwright, Cypress, and more',
    gradient: 'from-violet-500 to-purple-500',
    size: 'medium',
  },
  {
    icon: Sparkles,
    title: 'Works in Your IDE',
    description: 'VS Code extension or MCP server - your choice',
    gradient: 'from-pink-500 to-rose-500',
    size: 'medium',
  },
];

export function BentoGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[180px]">
      {features.map((feature, i) => {
        const Icon = feature.icon;
        
        return (
          <div
            key={i}
            className={`group relative bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all duration-300 overflow-hidden
              ${feature.size === 'large' ? 'lg:col-span-2 lg:row-span-2' : ''}
              ${feature.size === 'medium' ? 'md:col-span-2 lg:col-span-2' : ''}
              ${feature.size === 'small' ? 'md:col-span-1' : ''}
            `}
            style={{
              animationDelay: `${i * 100}ms`,
            }}
          >
            {/* Gradient glow on hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-2xl`} />
            
            {/* Content */}
            <div className="relative h-full flex flex-col">
              {/* Icon with gradient */}
              <div className={`inline-flex w-12 h-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              
              {/* Text */}
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-white transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {feature.description}
              </p>
              
              {/* Animated border gradient */}
              <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}>
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${feature.gradient} p-[1px]`}>
                  <div className="absolute inset-[1px] rounded-2xl bg-slate-900" />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
