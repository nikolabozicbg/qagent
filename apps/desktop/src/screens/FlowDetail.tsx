import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronDown, AlertCircle, CheckCircle2, Sparkles, Code, Lightbulb, Database, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useApp } from '@contexts/AppContext';
import { apiService } from '@services/api';

interface FlowData {
  id: string;
  name: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'no-tests' | 'passing' | 'partial' | 'failing';
  confidence: number;
  enriched: boolean;
  route: string;
  steps: string[];
  components: ComponentInfo[];
  insights: AIInsight[];
  testData?: TestData;
}

interface ComponentInfo {
  name: string;
  inputs: number;
  validations: string[];
  apis: string[];
  state: string[];
}

interface AIInsight {
  type: 'info' | 'warning' | 'recommendation';
  message: string;
  actions?: string[];
}

interface TestData {
  username?: string;
  password?: string;
  note?: string;
}

const mockFlowData: Record<string, FlowData> = {
  '1': {
    id: '1',
    name: 'User Login',
    priority: 'CRITICAL',
    status: 'no-tests',
    confidence: 94,
    enriched: true,
    route: '/signin → /dashboard',
    steps: [
      'Navigate to /signin',
      'Fill username field (detected: [name="username"])',
      'Fill password field (detected: [name="password"])',
      'Click submit button',
      'Wait for POST /users/login (expect 200 OK)',
      'Verify redirect to /dashboard',
      'Verify user data loaded',
    ],
    components: [
      {
        name: 'LoginForm.tsx',
        inputs: 2,
        validations: ['required on both fields'],
        apis: ['POST /users/login'],
        state: ['username', 'password', 'isSubmitting'],
      },
    ],
    insights: [
      {
        type: 'info',
        message: 'This flow handles authentication - critical for UX',
      },
      {
        type: 'warning',
        message: 'No error scenario tests detected',
      },
      {
        type: 'recommendation',
        message: 'Recommended test cases:',
        actions: [
          'Invalid credentials (401)',
          'Session timeout',
          'Server error handling (500)',
          'Network timeout',
        ],
      },
    ],
    testData: {
      username: 'admin@test.com',
      password: 'Test1234! (hashed)',
      note: 'Valid credentials found in seed data',
    },
  },
  '2': {
    id: '2',
    name: 'Create Transaction',
    priority: 'HIGH',
    status: 'passing',
    confidence: 87,
    enriched: true,
    route: '/transaction/new → /transactions/:id',
    steps: [
      'Navigate to /transaction/new',
      'Select account from dropdown',
      'Enter amount',
      'Enter description',
      'Click submit',
      'Wait for POST /transactions',
      'Verify redirect to transaction detail',
    ],
    components: [
      {
        name: 'TransactionForm.tsx',
        inputs: 3,
        validations: ['amount > 0', 'description required'],
        apis: ['POST /transactions', 'GET /bankaccounts'],
        state: ['accountId', 'amount', 'description', 'isLoading'],
      },
    ],
    insights: [
      {
        type: 'info',
        message: 'Transaction flow with financial validation',
      },
      {
        type: 'recommendation',
        message: 'Consider adding tests for:',
        actions: [
          'Insufficient funds scenario',
          'Invalid account selection',
          'Network retry logic',
        ],
      },
    ],
  },
};

export default function FlowDetail() {
  const navigate = useNavigate();
  const { flowId } = useParams<{ flowId: string }>();
  const { flows } = useApp();
  const [expandedComponent, setExpandedComponent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [flow, setFlow] = useState<any>(null);

  // Load flow from AppContext flows array
  useEffect(() => {
    if (flowId && flows.length > 0) {
      const foundFlow = flows.find(f => f.id === flowId);
      if (foundFlow) {
        // Generate detailed steps from components with realistic flow
        let steps = [];
        
        // Add navigation step from route
        const route = foundFlow.route || '/';
        const routeParts = route.split('→').map((r: string) => r.trim());
        if (routeParts[0]) {
          steps.push(`Navigate to ${routeParts[0]}`);
        }
        
        // Generate steps from components and their elements
        if (foundFlow.enrichedData?.components && foundFlow.enrichedData.components.length > 0) {
          foundFlow.enrichedData.components.forEach((comp: any) => {
            if (comp.elements && comp.elements.length > 0) {
              comp.elements.forEach((el: any) => {
                // Generate human-readable steps based on element type
                if (el.type === 'TextField' || el.type === 'input') {
                  const fieldName = el.selector.includes('username') ? 'username' : 
                                   el.selector.includes('password') ? 'password' :
                                   el.selector.includes('email') ? 'email' : 'input';
                  steps.push(`Fill ${fieldName} field (detected: ${el.selector})`);
                } else if (el.type === 'Button' || el.type === 'button' || el.type === 'submit') {
                  steps.push(`Click submit button`);
                }
              });
            }
          });
        }
        
        // Add API call step if components have APIs
        const apiCalls = foundFlow.enrichedData?.components?.flatMap((c: any) => c.apiCalls || []) || [];
        if (apiCalls.length > 0) {
          apiCalls.forEach((api: string) => {
            steps.push(`Wait for ${api} (expect 200 OK)`);
          });
        }
        
        // Add verification step from route destination
        if (routeParts.length > 1 && routeParts[1]) {
          steps.push(`Verify redirect to ${routeParts[1]}`);
        }
        
        // Add final verification
        steps.push('Verify user data loaded');
        
        // Fallback if no steps generated
        if (steps.length === 0) {
          steps = [
            `Navigate to ${route}`,
            'Interact with page elements',
            'Verify expected behavior'
          ];
        }
        
        // Create insights from edge cases
        const insights = [];
        if (foundFlow.enrichedData?.edgeCases && foundFlow.enrichedData.edgeCases.length > 0) {
          insights.push({
            type: 'recommendation',
            message: 'Recommended edge cases to test:',
            actions: foundFlow.enrichedData.edgeCases.map((ec: any) => 
              ec.scenario || ec.description || ec
            )
          });
        }
        
        // Add info about test estimation
        if (foundFlow.enrichedData?.estimatedTestCases) {
          insights.push({
            type: 'info',
            message: `Estimated ${foundFlow.enrichedData.estimatedTestCases} test cases needed`
          });
        }
        
        const detailedFlow = {
          ...foundFlow,
          steps,
          components: foundFlow.enrichedData?.components?.map((c: any) => {
            const inputs = c.elements?.filter((e: any) => e.type === 'TextField' || e.type === 'input').length || 0;
            const buttons = c.elements?.filter((e: any) => e.type === 'Button' || e.type === 'button').length || 0;
            return {
              name: c.name || c.component,
              inputs,
              validations: c.validations || (inputs > 0 ? [`${inputs} input fields detected`] : ['No validations']),
              apis: c.apiCalls || ['API calls not detected'],
              state: c.state || [`${c.elements?.length || 0} UI elements`]
            };
          }) || [],
          insights,
          testData: foundFlow.enrichedData?.testDataSuggestions || null,
        };
        setFlow(detailedFlow);
      }
      setIsLoading(false);
    }
  }, [flowId, flows]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60">Loading flow...</p>
        </div>
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Flow not found</h2>
          <button
            onClick={() => navigate('/app/flows')}
            className="text-sm px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg font-medium transition-colors"
          >
            Back to Flows
          </button>
        </div>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'text-error';
      case 'HIGH': return 'text-warning';
      case 'MEDIUM': return 'text-accent';
      case 'LOW': return 'text-success';
      default: return 'text-white/60';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'no-tests': return 'No tests';
      case 'passing': return 'All tests passing';
      case 'partial': return 'Partial coverage';
      case 'failing': return 'Tests failing';
      default: return 'Unknown';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'info': return <Lightbulb className="w-5 h-5 text-accent" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-warning" />;
      case 'recommendation': return <Sparkles className="w-5 h-5 text-primary" />;
      default: return <Lightbulb className="w-5 h-5 text-white/60" />;
    }
  };

  return (
    <div className="h-full bg-dark overflow-hidden flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/app/flows')}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Flows
          </button>
          <div>
            <h1 className="text-2xl font-bold">{flow.name}</h1>
          </div>
        </div>
        <div className="relative">
          <button className="px-4 py-2 glass hover:bg-white/10 rounded-lg font-medium transition-colors flex items-center gap-2">
            Actions
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Overview Card */}
          <div className="glass rounded-xl p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <span className="text-sm text-white/60">Priority:</span>
                <div className="flex items-center gap-2 mt-1">
                  <AlertCircle className={`w-5 h-5 ${getPriorityColor(flow.priority)}`} />
                  <span className={`font-semibold ${getPriorityColor(flow.priority)}`}>{flow.priority}</span>
                </div>
              </div>
              <div>
                <span className="text-sm text-white/60">Status:</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-white/80">{getStatusText(flow.status)}</span>
                </div>
              </div>
              <div>
                <span className="text-sm text-white/60">Confidence:</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-semibold">{flow.confidence}%</span>
                </div>
              </div>
              <div>
                <span className="text-sm text-white/60">Enriched:</span>
                <div className="flex items-center gap-2 mt-1">
                  {flow.enriched ? (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-warning" />
                  )}
                </div>
              </div>
              <div className="col-span-2">
                <span className="text-sm text-white/60">Route:</span>
                <p className="text-white/80 mt-1">{flow.route}</p>
              </div>
            </div>
          </div>

          {/* Flow Steps */}
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Flow Steps</h2>
            <div className="space-y-3">
              {flow.steps.map((step, index) => (
                <div key={index} className="flex items-start gap-3 glass rounded-lg p-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </div>
                  <p className="text-white/80 flex-1">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Components Analyzed */}
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Components Analyzed</h2>
            <div className="space-y-3">
              {flow.components && flow.components.length > 0 ? flow.components.map((component, index) => (
                <div key={index} className="glass rounded-lg">
                  <button
                    onClick={() => setExpandedComponent(expandedComponent === component.name ? null : component.name)}
                    className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Code className="w-5 h-5 text-primary" />
                      <span className="font-semibold">{component.name}</span>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-white/60 transition-transform ${expandedComponent === component.name ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {expandedComponent === component.name && (
                    <div className="px-4 pb-4 space-y-3 animate-fade-in-up">
                      <div className="pl-8 space-y-2 text-sm">
                        <p className="text-white/60">
                          • <span className="text-white/80">{component.inputs} input fields detected</span>
                        </p>
                        <p className="text-white/60">
                          • <span className="text-white/80">Validation: {component.validations.join(', ')}</span>
                        </p>
                        <p className="text-white/60">
                          • <span className="text-white/80">API call: {component.apis.join(', ')}</span>
                        </p>
                        <p className="text-white/60">
                          • <span className="text-white/80">State: {component.state.join(', ')}</span>
                        </p>
                      </div>
                      <button className="ml-8 text-sm text-primary hover:text-primary-hover flex items-center gap-1">
                        View Source Code →
                      </button>
                    </div>
                  )}
                </div>
              )) : (
                <div className="text-center py-8 text-white/40">
                  <Code className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No component analysis available</p>
                </div>
              )}
            </div>
          </div>

          {/* AI Insights */}
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">AI Insights</h2>
            <div className="space-y-3">
              {flow.insights && flow.insights.length > 0 ? flow.insights.map((insight, index) => (
                <div key={index} className="glass rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1">
                      <p className="text-white/80 mb-2">{insight.message}</p>
                      {insight.actions && (
                        <ul className="space-y-1 ml-4">
                          {insight.actions.map((action, i) => (
                            <li key={i} className="text-sm text-white/60">
                              • {action}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-white/40">
                  <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No AI insights available yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Test Data */}
          {flow.testData && Object.keys(flow.testData).length > 0 && (
            <div className="glass rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Database className="w-5 h-5 text-accent" />
                <h2 className="text-lg font-semibold">Test Data Suggestions</h2>
              </div>
              <div className="glass rounded-lg p-4 space-y-3">
                {flow.testData.note && (
                  <p className="text-sm text-white/80 pb-2 border-b border-white/10">{flow.testData.note}</p>
                )}
                {Object.entries(flow.testData).filter(([key]) => key !== 'note').map(([key, value]: [string, any]) => (
                  <div key={key} className="text-sm">
                    <span className="text-white/60 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>{' '}
                    <span className="text-white/80 font-mono">
                      {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generate Test Button */}
          <div className="flex justify-center py-6">
            <button className="px-8 py-4 bg-primary hover:bg-primary-hover rounded-lg font-semibold text-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-3 shadow-2xl">
              <Sparkles className="w-6 h-6" />
              Generate Complete Test Suite
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
