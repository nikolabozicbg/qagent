import { useState, useEffect } from 'react';
import { X, Code, Copy, ExternalLink, CheckCircle } from 'lucide-react';
import { useToast } from '@contexts/ToastContext';

interface ViewTestCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  testFile: string;
  projectPath: string;
}

export function ViewTestCodeModal({
  isOpen,
  onClose,
  testFile,
  projectPath,
}: ViewTestCodeModalProps) {
  const { showToast } = useToast();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const loadCode = async () => {
      setLoading(true);
      try {
        // Construct full path
        const fullPath = `${projectPath}/${testFile}`;
        
        if (window.electronAPI?.readFile) {
          const result = await window.electronAPI.readFile(fullPath);
          if (result.ok && result.contents) {
            setCode(result.contents);
          } else {
            setCode(`// Failed to load test file\n// ${result.error}`);
          }
        }
      } catch (err: any) {
        setCode(`// Error loading test file\n// ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadCode();
  }, [isOpen, testFile, projectPath]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    showToast({
      type: 'success',
      message: 'Test code copied to clipboard',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInEditor = async () => {
    const fullPath = `${projectPath}/${testFile}`;
    if (window.electronAPI?.openInEditor) {
      await window.electronAPI.openInEditor(fullPath);
      showToast({
        type: 'success',
        message: 'Opening in editor...',
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in-up">
      <div className="w-full max-w-4xl glass rounded-xl shadow-2xl border border-white/10 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Code className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-xl font-bold">Test Code</h2>
              <p className="text-sm text-white/60 font-mono">{testFile}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Actions */}
        <div className="px-6 py-3 border-b border-white/10 flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 text-sm glass hover:bg-white/10 rounded-lg transition-colors"
          >
            {copied ? (
              <>
                <CheckCircle className="w-4 h-4 text-success" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
          <button
            onClick={handleOpenInEditor}
            className="flex items-center gap-2 px-3 py-1.5 text-sm glass hover:bg-white/10 rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open in Editor
          </button>
        </div>

        {/* Code Display */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="glass rounded-lg p-4 overflow-auto">
              <pre className="text-xs text-white/80 font-mono whitespace-pre-wrap">
                {code}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 glass hover:bg-white/10 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
