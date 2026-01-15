import { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Save, 
  FileCode,
  Sparkles,
  RefreshCw,
  Loader2
} from 'lucide-react';

interface CodePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseName: string;
  suiteName: string;
  code: string;
  fileName: string;
  stats?: {
    linesOfCode?: number;
    assertions?: number;
    testCases?: number;
  };
  onSave: () => Promise<void>;
  onRegenerate?: () => Promise<void>;
  isSaving?: boolean;
  isRegenerating?: boolean;
}

export function CodePreviewModal({
  isOpen,
  onClose,
  caseName,
  suiteName,
  code,
  fileName,
  stats,
  onSave,
  onRegenerate,
  isSaving = false,
  isRegenerating = false
}: CodePreviewModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    await onSave();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-dark border border-white/10 rounded-2xl shadow-2xl w-[90vw] max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Generated Test Code</h2>
              <p className="text-sm text-white/50">
                {suiteName} → {caseName}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Stats */}
            {stats && (
              <div className="flex items-center gap-3 mr-4 text-sm text-white/50">
                {stats.linesOfCode && (
                  <span>{stats.linesOfCode} lines</span>
                )}
                {stats.assertions && (
                  <span>{stats.assertions} assertions</span>
                )}
              </div>
            )}
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>
        </div>

        {/* File name bar */}
        <div className="px-5 py-2 bg-white/[0.02] border-b border-white/5 flex items-center gap-2">
          <FileCode className="w-4 h-4 text-white/40" />
          <span className="text-sm font-mono text-white/60">tests/e2e/{fileName}</span>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-auto bg-[#1e1e2e]">
          <pre className="p-5 text-sm font-mono text-white/80 leading-relaxed">
            <code>{code}</code>
          </pre>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 glass hover:bg-white/10 rounded-lg text-sm font-medium transition-colors"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
            
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="flex items-center gap-2 px-4 py-2 glass hover:bg-white/10 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isRegenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Regenerate
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? 'Saving...' : 'Save to Project'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
