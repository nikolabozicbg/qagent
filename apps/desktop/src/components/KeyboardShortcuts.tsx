import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command, Search, Sparkles, Play, Brain, X } from 'lucide-react';

interface KeyboardShortcutsProps {
  onGenerateTest?: () => void;
  onRunDiscovery?: () => void;
  onToggleAI?: () => void;
}

export function KeyboardShortcuts({ onGenerateTest, onRunDiscovery, onToggleAI }: KeyboardShortcutsProps) {
  const navigate = useNavigate();
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const commands = [
    { id: 'dashboard', label: 'Go to Dashboard', shortcut: '⌘1', action: () => navigate('/app/dashboard') },
    { id: 'flows', label: 'Go to Flows', shortcut: '⌘2', action: () => navigate('/app/flows') },
    { id: 'settings', label: 'Go to Settings', shortcut: '⌘3', action: () => navigate('/app/settings') },
    { id: 'generate', label: 'Generate Test', shortcut: '⌘G', action: onGenerateTest },
    { id: 'run', label: 'Run Discovery', shortcut: '⌘R', action: onRunDiscovery },
    { id: 'ai', label: 'Toggle AI Co-pilot', shortcut: '⌘J', action: onToggleAI },
    { id: 'help', label: 'Show Shortcuts', shortcut: '⌘/', action: () => setShowShortcutsHelp(true) },
  ];

  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command palette: ⌘K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }

      // Generate test: ⌘G
      if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
        e.preventDefault();
        onGenerateTest?.();
      }

      // Run discovery: ⌘R
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault();
        onRunDiscovery?.();
      }

      // Toggle AI: ⌘J
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        onToggleAI?.();
      }

      // Navigation shortcuts
      if ((e.metaKey || e.ctrlKey) && e.key === '1') {
        e.preventDefault();
        navigate('/app/dashboard');
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '2') {
        e.preventDefault();
        navigate('/app/flows');
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '3') {
        e.preventDefault();
        navigate('/app/settings');
      }

      // Help: ⌘/
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setShowShortcutsHelp(true);
      }

      // Close modals: Escape
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
        setShowShortcutsHelp(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, onGenerateTest, onRunDiscovery, onToggleAI]);

  const executeCommand = (command: typeof commands[0]) => {
    command.action?.();
    setShowCommandPalette(false);
    setSearchQuery('');
  };

  return (
    <>
      {/* Command Palette */}
      {showCommandPalette && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-32 bg-black/50 backdrop-blur-sm animate-fade-in-up">
          <div className="w-full max-w-2xl glass rounded-xl shadow-2xl overflow-hidden border border-white/10">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
              <Search className="w-5 h-5 text-white/60" />
              <input
                type="text"
                placeholder="Search commands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="flex-1 bg-transparent outline-none text-white placeholder:text-white/40"
              />
              <button
                onClick={() => setShowCommandPalette(false)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {filteredCommands.length === 0 ? (
                <div className="px-4 py-8 text-center text-white/60">
                  No commands found
                </div>
              ) : (
                <div className="py-2">
                  {filteredCommands.map((command) => (
                    <button
                      key={command.id}
                      onClick={() => executeCommand(command)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                    >
                      <span className="text-white/80">{command.label}</span>
                      <kbd className="px-2 py-1 text-xs bg-white/10 rounded border border-white/20 font-mono">
                        {command.shortcut}
                      </kbd>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="px-4 py-2 border-t border-white/10 text-xs text-white/60 flex items-center gap-4">
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>Esc Close</span>
            </div>
          </div>
        </div>
      )}

      {/* Shortcuts Help Overlay */}
      {showShortcutsHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in-up">
          <div className="w-full max-w-2xl glass rounded-xl shadow-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Keyboard Shortcuts</h2>
              <button
                onClick={() => setShowShortcutsHelp(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-white/60 mb-3 uppercase">Navigation</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-white/80">Go to Dashboard</span>
                    <kbd className="px-3 py-1.5 text-sm bg-white/10 rounded border border-white/20 font-mono">⌘1</kbd>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-white/80">Go to Flows</span>
                    <kbd className="px-3 py-1.5 text-sm bg-white/10 rounded border border-white/20 font-mono">⌘2</kbd>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-white/80">Go to Settings</span>
                    <kbd className="px-3 py-1.5 text-sm bg-white/10 rounded border border-white/20 font-mono">⌘3</kbd>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white/60 mb-3 uppercase">Actions</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-white/80">Command Palette</span>
                    <kbd className="px-3 py-1.5 text-sm bg-white/10 rounded border border-white/20 font-mono">⌘K</kbd>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-white/80">Generate Test</span>
                    <kbd className="px-3 py-1.5 text-sm bg-white/10 rounded border border-white/20 font-mono">⌘G</kbd>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-white/80">Run Discovery</span>
                    <kbd className="px-3 py-1.5 text-sm bg-white/10 rounded border border-white/20 font-mono">⌘R</kbd>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-white/80">Toggle AI Co-pilot</span>
                    <kbd className="px-3 py-1.5 text-sm bg-white/10 rounded border border-white/20 font-mono">⌘J</kbd>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-white/80">Show Shortcuts</span>
                    <kbd className="px-3 py-1.5 text-sm bg-white/10 rounded border border-white/20 font-mono">⌘/</kbd>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 text-sm text-white/60">
              Press <kbd className="px-2 py-0.5 bg-white/10 rounded font-mono text-xs">Esc</kbd> to close
            </div>
          </div>
        </div>
      )}

      {/* Shortcut hint badge (bottom-right) */}
      <button
        onClick={() => setShowShortcutsHelp(true)}
        className="fixed bottom-4 left-4 px-3 py-2 glass rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2"
      >
        <Command className="w-3 h-3" />
        <span>Press ⌘K for commands</span>
      </button>
    </>
  );
}
