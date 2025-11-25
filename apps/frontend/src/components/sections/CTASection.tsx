import EmailWaitlist from "@/components/EmailWaitlist";

export default function CTASection() {
  return (
    <section className="px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="relative py-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-pink-500/10"></div>
          <div className="relative max-w-3xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 mb-4">
              <div className="w-1 h-1 rounded-full bg-slate-500"></div>
              <span>JOIN THE BETA</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold mb-3">
              Get <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">early access</span>
            </h2>
            <p className="text-lg text-slate-400 mb-10 max-w-lg mx-auto">
              Join 1,247 developers building better software with AI-powered testing
            </p>
            
            <EmailWaitlist variant="inline" />
          </div>
        </div>
      </div>
    </section>
  );
}
