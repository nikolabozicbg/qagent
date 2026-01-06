export default function SimpleWelcome() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-dark">
      <div className="text-center">
        <h1 className="text-6xl mb-4">⚡</h1>
        <h2 className="text-4xl font-bold text-white mb-4">Welcome to QAgent</h2>
        <p className="text-white/60 mb-8">Desktop app is working!</p>
        <button className="px-8 py-4 bg-primary text-white rounded-lg font-semibold hover:bg-primary/80 transition-colors">
          Get Started
        </button>
      </div>
    </div>
  );
}
