export default function TechBadgeStack() {
  const techs = [
    { name: "VS Code", icon: "💻", color: "from-blue-500 to-blue-600" },
    { name: "TypeScript", icon: "📘", color: "from-blue-600 to-blue-700" },
    { name: "React", icon: "⚛️", color: "from-cyan-500 to-blue-500" },
    { name: "AI Powered", icon: "🤖", color: "from-purple-500 to-pink-500" },
    { name: "Jest", icon: "🃏", color: "from-red-500 to-orange-500" },
    { name: "Playwright", icon: "🎭", color: "from-green-500 to-emerald-500" },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {techs.map((tech) => (
        <div
          key={tech.name}
          className={`group relative px-4 py-2 rounded-lg bg-gradient-to-r ${tech.color} bg-opacity-10 border border-white/10 hover:scale-105 hover:shadow-lg transition-all duration-300 cursor-pointer`}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg group-hover:animate-bounce">{tech.icon}</span>
            <span className="text-sm font-medium text-white">{tech.name}</span>
          </div>
          
          {/* Tooltip */}
          <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Built with {tech.name}
          </div>
        </div>
      ))}
    </div>
  );
}
