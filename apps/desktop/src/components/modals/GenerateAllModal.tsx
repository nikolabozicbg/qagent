import { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  Loader2, 
  Play,
  FileCode,
  XCircle
} from 'lucide-react';
import { TestCase } from '@/types/suite.types';

interface GenerateAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  suiteName: string;
  cases: TestCase[];
  onGenerate: (testCase: TestCase) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  onComplete?: (results: GenerationResult[]) => void;
  onRunAll?: () => void;
}

interface GenerationResult {
  caseId: string;
  caseName: string;
  status: 'pending' | 'generating' | 'done' | 'error';
  filePath?: string;
  error?: string;
  progress?: number;
}

export function GenerateAllModal({ 
  isOpen, 
  onClose, 
  suiteName,
  cases,
  onGenerate,
  onComplete,
  onRunAll
}: GenerateAllModalProps) {
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Filter only cases that need generation
  const pendingCases = cases.filter(tc => 
    !tc.testFilePath && tc.status !== 'passing' && tc.status !== 'passed'
  );

  // Initialize results when modal opens
  useEffect(() => {
    if (isOpen && pendingCases.length > 0) {
      setResults(pendingCases.map(tc => ({
        caseId: tc.id,
        caseName: tc.name,
        status: 'pending'
      })));
      setIsGenerating(false);
      setIsComplete(false);
      setCurrentIndex(0);
    }
  }, [isOpen]);

  // Start generation automatically when modal opens
  useEffect(() => {
    if (isOpen && results.length > 0 && !isGenerating && !isComplete) {
      startGeneration();
    }
  }, [isOpen, results.length]);

  const startGeneration = async () => {
    setIsGenerating(true);
    
    for (let i = 0; i < pendingCases.length; i++) {
      const testCase = pendingCases[i];
      setCurrentIndex(i);
      
      // Update status to generating
      setResults(prev => prev.map((r, idx) => 
        idx === i ? { ...r, status: 'generating', progress: 0 } : r
      ));

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setResults(prev => prev.map((r, idx) => 
          idx === i && r.status === 'generating' 
            ? { ...r, progress: Math.min((r.progress || 0) + 15, 90) } 
            : r
        ));
      }, 500);

      try {
        const result = await onGenerate(testCase);
        clearInterval(progressInterval);
        
        setResults(prev => prev.map((r, idx) => 
          idx === i 
            ? { 
                ...r, 
                status: result.success ? 'done' : 'error',
                filePath: result.filePath,
                error: result.error,
                progress: 100
              } 
            : r
        ));
      } catch (error: any) {
        clearInterval(progressInterval);
        setResults(prev => prev.map((r, idx) => 
          idx === i ? { ...r, status: 'error', error: error.message } : r
        ));
      }
    }

    setIsGenerating(false);
    setIsComplete(true);
    onComplete?.(results);
  };

  const completedCount = results.filter(r => r.status === 'done').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const totalLines = completedCount * 25; // Estimate

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-dark border border-white/10 rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            {isComplete ? (
              <CheckCircle2 className="w-6 h-6 text-green-400" />
            ) : (
              <Sparkles className="w-6 h-6 text-purple-400" />
            )}
            <div>
              <h2 className="text-lg font-semibold">
                {isComplete ? 'Generation Complete' : 'Generate All Tests'}
              </h2>
              <p className="text-sm text-white/50">
                {isComplete 
                  ? `Successfully generated ${completedCount} tests`
                  : `Generate Playwright tests for ${pendingCases.length} cases in ${suiteName}`
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[400px] overflow-y-auto">
          {/* Case List */}
          <div className="space-y-3">
            {results.map((result, idx) => (
              <div 
                key={result.caseId}
                className={`rounded-lg p-4 border transition-colors ${
                  result.status === 'done' 
                    ? 'bg-green-500/5 border-green-500/20'
                    : result.status === 'error'
                    ? 'bg-red-500/5 border-red-500/20'
                    : result.status === 'generating'
                    ? 'bg-purple-500/5 border-purple-500/30'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {result.status === 'done' && (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    )}
                    {result.status === 'error' && (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                    {result.status === 'generating' && (
                      <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                    )}
                    {result.status === 'pending' && (
                      <div className="w-5 h-5 rounded-full border-2 border-white/20" />
                    )}
                    <span className={`font-medium ${
                      result.status === 'pending' ? 'text-white/40' : 'text-white'
                    }`}>
                      {result.caseName}
                    </span>
                  </div>
                  <span className="text-xs text-white/40">
                    {result.status === 'done' && 'Done'}
                    {result.status === 'error' && 'Error'}
                    {result.status === 'generating' && 'Generating'}
                    {result.status === 'pending' && 'Pending'}
                  </span>
                </div>
                
                {/* Progress bar for generating */}
                {result.status === 'generating' && (
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 rounded-full transition-all duration-300"
                      style={{ width: `${result.progress || 0}%` }}
                    />
                  </div>
                )}
                
                {/* File path for done */}
                {result.status === 'done' && result.filePath && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-white/40">
                    <FileCode className="w-3 h-3" />
                    <span className="font-mono">{result.filePath}</span>
                  </div>
                )}
                
                {/* Error message */}
                {result.status === 'error' && result.error && (
                  <p className="mt-2 text-xs text-red-400">{result.error}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10">
          {/* Progress summary */}
          {!isComplete && (
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-white/60">
                Progress: {completedCount}/{pendingCases.length} complete
              </span>
              {isGenerating && (
                <button
                  onClick={onClose}
                  className="text-sm text-white/40 hover:text-white transition-colors"
                >
                  Hide
                </button>
              )}
            </div>
          )}
          
          {/* Completion summary */}
          {isComplete && (
            <div className="mb-4 text-sm text-white/60">
              Total: {completedCount} files created, ~{totalLines} lines of code
              {errorCount > 0 && (
                <span className="text-red-400 ml-2">({errorCount} failed)</span>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3">
            {isComplete ? (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg font-medium transition-colors"
                >
                  View Files
                </button>
                {completedCount > 0 && onRunAll && (
                  <button
                    onClick={() => {
                      onClose();
                      onRunAll();
                    }}
                    className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary-hover rounded-lg font-medium transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Run All
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
