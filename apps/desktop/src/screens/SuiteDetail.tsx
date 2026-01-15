import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Play, 
  Sparkles, 
  Search, 
  Wrench,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Loader2
} from 'lucide-react';
import { CaseListCard } from '@components/suites';
import { GenerateAllModal } from '@components/modals/GenerateAllModal';
import { CodePreviewModal } from '@components/modals/CodePreviewModal';
import { useSuiteStore } from '@stores/useSuiteStore';
import { useProjectStore } from '@stores/useProjectStore';
import { useToast } from '@contexts/ToastContext';
import { CATEGORY_ICONS, PRIORITY_COLORS, TestCase } from '@/types/suite.types';
import api from '@services/api';

type CaseFilterOption = 'all' | 'generated' | 'not-generated' | 'passing' | 'failing';

export default function SuiteDetail() {
  const navigate = useNavigate();
  const { suiteId } = useParams<{ suiteId: string }>();
  const { getSuiteById, updateCaseFilePath } = useSuiteStore();
  const { currentProject } = useProjectStore();
  const { showToast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<CaseFilterOption>('all');
  const [isRunning, setIsRunning] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generatingCaseId, setGeneratingCaseId] = useState<string | null>(null);
  
  // Code preview modal state
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    testCase: TestCase | null;
    code: string;
    fileName: string;
    stats: { linesOfCode?: number; assertions?: number } | null;
  }>({ isOpen: false, testCase: null, code: '', fileName: '', stats: null });
  const [isSavingPreview, setIsSavingPreview] = useState(false);

  const suite = getSuiteById(suiteId || '');

  if (!suite) {
    return (
      <div className="h-screen bg-dark flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-3">Suite Not Found</h2>
          <p className="text-white/60 mb-6">The requested test suite could not be found.</p>
          <button
            onClick={() => navigate('/app/suites')}
            className="px-6 py-3 bg-primary hover:bg-primary-hover rounded-lg font-medium transition-colors"
          >
            Back to Suites
          </button>
        </div>
      </div>
    );
  }

  const CategoryIcon = CATEGORY_ICONS[suite.category] || Wrench;
  const priorityColor = PRIORITY_COLORS[suite.priority] || PRIORITY_COLORS['MEDIUM'];

  const testCases = suite.testCases || [];

  // Filter and search test cases
  const filteredCases = testCases
    .filter(testCase => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          testCase.name.toLowerCase().includes(query) ||
          testCase.description?.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .filter(testCase => {
      // Status filter
      if (filterBy === 'all') return true;
      const isGenerated = testCase.testFilePath || testCase.status === 'passing' || testCase.status === 'passed';
      if (filterBy === 'generated') return isGenerated;
      if (filterBy === 'not-generated') return !isGenerated;
      if (filterBy === 'passing') return testCase.status === 'passing' || testCase.status === 'passed';
      if (filterBy === 'failing') return testCase.status === 'failing' || testCase.status === 'failed';
      return true;
    });

  // Calculate stats
  const stats = {
    total: testCases.length,
    generated: testCases.filter(tc => tc.testFilePath || tc.status === 'passing' || tc.status === 'passed').length,
    notGenerated: testCases.filter(tc => !tc.testFilePath && tc.status !== 'passing' && tc.status !== 'passed').length,
    passing: testCases.filter(tc => tc.status === 'passing' || tc.status === 'passed').length,
    failing: testCases.filter(tc => tc.status === 'failing' || tc.status === 'failed').length,
    totalSteps: testCases.reduce((acc, tc) => acc + (tc.steps?.length || 0), 0),
  };
  
  const coveragePercent = stats.total > 0 
    ? Math.round((stats.generated / stats.total) * 100) 
    : 0;

  // Handlers
  const handleRunAll = async () => {
    if (!currentProject?.projectPath) return;
    setIsRunning(true);
    try {
      const testFiles = testCases
        .filter(tc => tc.testFilePath)
        .map(tc => tc.testFilePath!);
      
      const result = await api.runTests({
        projectPath: currentProject.projectPath,
        testFiles,
        framework: currentProject.framework || 'playwright'
      });
      navigate('/app/results', { state: { result, suite } });
    } catch (error: any) {
      showToast({ type: 'error', message: error.message || 'Failed to run tests' });
    } finally {
      setIsRunning(false);
    }
  };

  const handleGenerateAll = () => {
    if (!currentProject?.projectPath) return;
    setShowGenerateModal(true);
  };

  const handleGenerateSingleCase = async (testCase: TestCase): Promise<{ success: boolean; filePath?: string; error?: string }> => {
    if (!currentProject?.projectPath) {
      return { success: false, error: 'No project selected' };
    }
    
    try {
      const result = await api.generateFromCase({
        testCase: {
          id: testCase.id,
          name: testCase.name,
          description: testCase.description,
          priority: testCase.priority,
          steps: (testCase.steps || []).map(s => ({
            action: s.action,
            target: s.target,
            value: s.value,
            selector: s.selector,
            expectedResult: s.assertions?.[0],
            description: s.description,
            assertions: s.assertions,
            api: s.api
          })),
          testData: testCase.testData,
          metadata: testCase.metadata
        },
        suite: {
          id: suite.id,
          name: suite.name,
          category: suite.category
        },
        workspacePath: currentProject.projectPath,
        baseUrl: currentProject.baseUrl
      });
      
      if (!result.success || !result.testCode || !result.fileName) {
        return { success: false, error: result.error || 'Generation failed' };
      }
      
      // Save the generated file to the project
      const relativeFilePath = `tests/e2e/${result.fileName}`;
      const absoluteFilePath = `${currentProject.projectPath}/${relativeFilePath}`;
      
      const saveResult = await window.electronAPI.saveTestFile(
        absoluteFilePath,
        result.testCode
      );
      
      if (!saveResult.ok) {
        return { success: false, error: saveResult.error || 'Failed to save file' };
      }
      
      // Update store with the file path and persist to backend
      updateCaseFilePath(testCase.id, relativeFilePath, result.testCode);
      
      return { 
        success: true, 
        filePath: relativeFilePath
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'Generation failed' };
    }
  };

  const handleRunCase = async (testCase: any) => {
    if (!currentProject?.projectPath || !testCase.testFilePath) return;
    showToast({ type: 'info', message: `Running ${testCase.name}...` });
    try {
      const result = await api.runTests({
        projectPath: currentProject.projectPath,
        testFiles: [testCase.testFilePath],
        framework: currentProject.framework || 'playwright'
      });
      navigate('/app/results', { state: { result, testCase, suite } });
    } catch (error: any) {
      showToast({ type: 'error', message: error.message || 'Failed to run test' });
    }
  };

  // Generate and show preview modal (for single case "Generate" button)
  const handleGenerateCase = async (testCase: TestCase) => {
    if (generatingCaseId) return; // Already generating
    if (!currentProject?.projectPath) {
      showToast({ type: 'error', message: 'No project selected' });
      return;
    }
    
    setGeneratingCaseId(testCase.id);
    
    try {
      // Generate code but don't save yet
      const result = await api.generateFromCase({
        testCase: {
          id: testCase.id,
          name: testCase.name,
          description: testCase.description,
          priority: testCase.priority,
          steps: (testCase.steps || []).map(s => ({
            action: s.action,
            target: s.target,
            value: s.value,
            selector: s.selector,
            expectedResult: s.assertions?.[0],
            description: s.description,
            assertions: s.assertions,
            api: s.api
          })),
          testData: testCase.testData,
          metadata: testCase.metadata
        },
        suite: {
          id: suite.id,
          name: suite.name,
          category: suite.category
        },
        workspacePath: currentProject.projectPath,
        baseUrl: currentProject.baseUrl
      });
      
      if (result.success && result.testCode && result.fileName) {
        // Show preview modal
        setPreviewModal({
          isOpen: true,
          testCase,
          code: result.testCode,
          fileName: result.fileName,
          stats: result.stats
        });
      } else {
        showToast({ type: 'error', message: result.error || 'Generation failed' });
      }
    } catch (error: any) {
      showToast({ type: 'error', message: error.message || 'Generation failed' });
    } finally {
      setGeneratingCaseId(null);
    }
  };
  
  // Save from preview modal
  const handleSaveFromPreview = async () => {
    if (!previewModal.testCase || !previewModal.code || !currentProject?.projectPath) return;
    
    setIsSavingPreview(true);
    try {
      const relativeFilePath = `tests/e2e/${previewModal.fileName}`;
      const absoluteFilePath = `${currentProject.projectPath}/${relativeFilePath}`;
      
      const saveResult = await window.electronAPI.saveTestFile(
        absoluteFilePath,
        previewModal.code
      );
      
      if (saveResult.ok) {
        updateCaseFilePath(previewModal.testCase.id, relativeFilePath, previewModal.code);
        showToast({ type: 'success', message: `✓ Saved to ${previewModal.fileName}` });
        setPreviewModal({ isOpen: false, testCase: null, code: '', fileName: '', stats: null });
      } else {
        showToast({ type: 'error', message: saveResult.error || 'Failed to save file' });
      }
    } catch (error: any) {
      showToast({ type: 'error', message: error.message || 'Failed to save file' });
    } finally {
      setIsSavingPreview(false);
    }
  };

  return (
    <div className="h-screen bg-dark overflow-hidden flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/app/suites')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white/60" />
            </button>
            
            <div className="flex items-center gap-3">
              <div 
                className="w-11 h-11 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${priorityColor}15` }}
              >
                <CategoryIcon className="w-5 h-5" style={{ color: priorityColor }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{suite.name}</h1>
                  <span 
                    className="text-xs font-medium px-2 py-0.5 rounded"
                    style={{ 
                      backgroundColor: `${priorityColor}20`,
                      color: priorityColor 
                    }}
                  >
                    {suite.priority}
                  </span>
                </div>
                <p className="text-sm text-white/50">
                  {suite.category} • {stats.total} cases • {stats.totalSteps} steps
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {stats.notGenerated > 0 && (
              <button 
                onClick={handleGenerateAll}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Generate All ({stats.notGenerated})
              </button>
            )}
            {stats.generated > 0 && (
              <button 
                onClick={handleRunAll}
                disabled={isRunning}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {isRunning ? 'Running...' : `Run All (${stats.generated})`}
              </button>
            )}
          </div>
        </div>

        {/* Coverage Card */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-white/60 mb-1">Suite Coverage</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{coveragePercent}%</span>
                <span className="text-white/40 text-sm">
                  {stats.generated} / {stats.total} cases generated
                </span>
              </div>
            </div>
            
            {/* Status Summary */}
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-lg font-bold">{stats.passing}</p>
                  <p className="text-xs text-white/40">Passing</p>
                </div>
              </div>
              {stats.failing > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <XCircle className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{stats.failing}</p>
                    <p className="text-xs text-white/40">Failing</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-500/20 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-lg font-bold">{stats.notGenerated}</p>
                  <p className="text-xs text-white/40">Pending</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${coveragePercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="border-b border-white/10 px-8 py-3">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search test cases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterBy('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterBy === 'all' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => setFilterBy('generated')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                filterBy === 'generated' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Generated ({stats.generated})
            </button>
            <button
              onClick={() => setFilterBy('not-generated')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                filterBy === 'not-generated' 
                  ? 'bg-slate-500/20 text-slate-400' 
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Pending ({stats.notGenerated})
            </button>
            {stats.failing > 0 && (
              <button
                onClick={() => setFilterBy('failing')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  filterBy === 'failing' 
                    ? 'bg-red-500/20 text-red-400' 
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Failing ({stats.failing})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Empty State */}
        {testCases.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Sparkles className="w-16 h-16 text-white/20 mb-4" />
            <h2 className="text-xl font-bold mb-2">No Test Cases</h2>
            <p className="text-white/50 mb-4 text-sm">
              This suite doesn't have any test cases yet.
            </p>
          </div>
        )}

        {/* Test Cases List */}
        {filteredCases.length > 0 && (
          <div className="space-y-3">
            {filteredCases.map(testCase => (
              <CaseListCard
                key={testCase.id}
                testCase={testCase}
                onClick={() => navigate(`/app/suites/${suiteId}/cases/${testCase.id}`)}
                onRun={() => handleRunCase(testCase)}
                onGenerate={() => handleGenerateCase(testCase)}
                isGenerating={generatingCaseId === testCase.id}
              />
            ))}
          </div>
        )}

        {/* No Results */}
        {testCases.length > 0 && filteredCases.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Search className="w-12 h-12 text-white/20 mb-3" />
            <h2 className="text-lg font-bold mb-2">No Results</h2>
            <p className="text-white/50 mb-4 text-sm">
              Try different search or filter criteria
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterBy('all');
              }}
              className="px-4 py-2 glass hover:bg-white/10 rounded-lg font-medium transition-colors text-sm"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Generate All Modal */}
      <GenerateAllModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        suiteName={suite.name}
        cases={testCases}
        onGenerate={handleGenerateSingleCase}
        onComplete={() => {
          showToast({ type: 'success', message: 'All tests generated successfully!' });
        }}
        onRunAll={handleRunAll}
      />
      
      {/* Code Preview Modal */}
      <CodePreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal({ isOpen: false, testCase: null, code: '', fileName: '', stats: null })}
        caseName={previewModal.testCase?.name || ''}
        suiteName={suite.name}
        code={previewModal.code}
        fileName={previewModal.fileName}
        stats={previewModal.stats || undefined}
        onSave={handleSaveFromPreview}
        isSaving={isSavingPreview}
      />
    </div>
  );
}
