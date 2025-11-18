"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardCopy, FileJson, FileText, Lightbulb, FlaskConical, Code2, TestTube2, Crown, Loader2, Sparkles, MousePointer2, Boxes, FileCode, Bug, Globe, Server } from "lucide-react";
import { copyToClipboard } from "@/lib/copy";
import { toast } from "sonner";
import ProFeature from "@/components/subscription/ProFeature";
import { useSubscription } from "@/hooks/useSubscription";
import QASuite from "@/components/qa-suite/QASuite";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion } from "framer-motion";
import { refineSuite } from "@/lib/api";

export default function ResultPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refinePrompt, setRefinePrompt] = useState("");
  const [refining, setRefining] = useState(false);
  const { isPro } = useSubscription();

  useEffect(() => {
    // Load result from sessionStorage
    const stored = sessionStorage.getItem('qagent_result');
    
    if (stored) {
      try {
        const result = JSON.parse(stored);
        setData(result);
        
        // Show warning if mock mode
        if (result._meta?.mode === 'mock') {
          const reason = result._meta.reason === 'openai_error' 
            ? `OpenAI API Error: ${result._meta.error}` 
            : 'No OpenAI API key configured';
          
          toast.warning('Mock Mode Active', {
            description: `${reason}. Showing sample data.`,
            duration: 10000,
          });
        }
      } catch (err) {
        setError('Failed to load result');
      }
    } else {
      setError('No result data found');
    }
    
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="p-20 text-center">
        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-xl">Generating test suite, please wait...</p>
      </div>
    );
  }
  
  if (error) return <div className="p-20 text-xl text-center text-red-500">Error: {error}</div>;
  if (!data) return <div className="p-20 text-xl text-center">No data found</div>;

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qagent-output.json";
    a.click();
    toast.success("Exported as JSON");
  };

  const handleExportTxt = () => {
    const blob = new Blob(
      [data.scenarios + "\n\n" + data.test_cases + "\n\n" + data.gherkin + "\n\n" + data.automation],
      { type: "text/plain" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qagent-output.txt";
    a.click();
    toast.success("Exported as TXT");
  };

  const handleRefine = async () => {
    if (!refinePrompt.trim()) {
      toast.error("Please enter refinement instructions");
      return;
    }

    setRefining(true);
    toast.info("Refining test suite...");

    try {
      const refined = await refineSuite(data, refinePrompt);
      setData(refined);
      sessionStorage.setItem('qagent_result', JSON.stringify(refined));
      
      toast.success("Test suite refined!", {
        description: "Your improvements have been applied"
      });
      setRefinePrompt("");
    } catch (err: any) {
      toast.error("Refinement failed", {
        description: err.message
      });
    } finally {
      setRefining(false);
    }
  };

  // Count items in sections - handle both string and object formats
  const getCount = (field: any, delimiter: string) => {
    if (!field) return 0;
    if (typeof field === 'string') {
      return field.split(delimiter).filter((s: string) => s.trim()).length;
    }
    if (Array.isArray(field)) return field.length;
    return 1;
  };

  const scenarioCount = getCount(data.scenarios, '\n\n');
  const testCaseCount = getCount(data.test_cases, '\n\n');
  const gherkinCount = typeof data.gherkin === 'string' ? data.gherkin.split('Scenario:').length - 1 : 0;

  return (
    <div className="max-w-6xl mx-auto p-10 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Generated Test Suite</h1>
          <div className="flex items-center gap-3">
            <p className="text-gray-600">AI-powered test generation complete</p>
            {data._meta?.mode === 'openai' && (
              <div className="flex items-center gap-2 text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full border border-green-300">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-semibold">Real AI Generated</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button 
            onClick={() => router.push('/')}
            variant="outline"
            size="lg"
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Generate New Suite
          </Button>
          
          {data._meta?.mode === 'mock' && (
            <div className="flex items-center gap-2 px-5 py-3 rounded-lg border-2 border-orange-400 bg-orange-100">
              <div className="text-2xl">⚠️</div>
              <div>
                <p className="font-bold text-orange-900 text-sm">DEMO MODE</p>
                <p className="text-orange-700 text-xs">Using sample data</p>
              </div>
            </div>
          )}
          
          {!isPro && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-lg">
              <Crown className="w-4 h-4" />
              <span className="font-semibold">Free Version</span>
            </div>
          )}
        </div>
      </div>


      {/* Refine Prompt */}
      <div className="bg-white border rounded-lg p-6 relative">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-lg">Refine Your Test Suite</h3>
          {!isPro && <Crown className="w-5 h-5 text-amber-500 ml-2" />}
        </div>
        
        {isPro ? (
          <>
            <Textarea
              placeholder="E.g., 'Add more edge cases for authentication' or 'Include performance test scenarios'"
              value={refinePrompt}
              onChange={(e) => setRefinePrompt(e.target.value)}
              className="mb-3 min-h-[80px]"
            />
            
            <Button 
              onClick={handleRefine} 
              disabled={refining || !refinePrompt.trim()}
              className="gap-2"
            >
              {refining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Refining...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Regenerate with Changes
                </>
              )}
            </Button>
          </>
        ) : (
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-8 rounded-lg border-2 border-dashed border-purple-200 text-center">
            <Crown className="w-12 h-12 text-purple-500 mx-auto mb-3" />
            <p className="text-lg font-semibold mb-2">AI Refinement is a Pro Feature</p>
            <p className="text-gray-600 mb-4">Upgrade to refine and improve your test suites with AI</p>
            <ProFeature>
              <Button className="gap-2">
                <Crown className="w-4 h-4" />
                Upgrade to Pro
              </Button>
            </ProFeature>
          </div>
        )}
      </div>

      {/* Export Buttons */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Test Suite
        </h3>
        <div className="flex gap-4">
          <ProFeature onClick={handleExportJson}>
            <Button variant="outline" disabled={!isPro} size="lg" className="flex-1">
              <FileJson className="w-5 h-5 mr-2" /> 
              Export as JSON {!isPro && <Crown className="w-4 h-4 ml-2" />}
            </Button>
          </ProFeature>

          <ProFeature onClick={handleExportTxt}>
            <Button variant="outline" disabled={!isPro} size="lg" className="flex-1">
              <FileText className="w-5 h-5 mr-2" /> 
              Export as TXT {!isPro && <Crown className="w-4 h-4 ml-2" />}
            </Button>
          </ProFeature>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="scenarios" className="space-y-6">
        <TabsList>
          <TabsTrigger value="scenarios">
            <Lightbulb className="w-4 h-4 mr-1" /> 
            Scenarios ({scenarioCount})
          </TabsTrigger>
          <TabsTrigger value="testcases">
            <TestTube2 className="w-4 h-4 mr-1" /> 
            Test Cases ({testCaseCount})
          </TabsTrigger>
          <TabsTrigger value="gherkin">
            <FlaskConical className="w-4 h-4 mr-1" /> 
            Gherkin ({gherkinCount})
          </TabsTrigger>
          <TabsTrigger value="automation" disabled={!isPro}>
            <Code2 className="w-4 h-4 mr-1" /> 
            Automation {!isPro && <Crown className="w-3 h-3 ml-1" />}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scenarios">
          {Array.isArray(data.scenarios) ? (
            <ScenariosCards scenarios={data.scenarios} isPro={isPro} />
          ) : (
            <ContentBlock content={data.scenarios || "No scenarios generated"} isPro={isPro} />
          )}
        </TabsContent>

        <TabsContent value="testcases">
          <ContentBlock content={data.test_cases || "No test cases generated"} isPro={isPro} />
        </TabsContent>

        <TabsContent value="gherkin">
          <ContentBlock content={data.gherkin || "No Gherkin scenarios generated"} isPro={isPro} language="gherkin" />
        </TabsContent>

        <TabsContent value="automation">
          {isPro ? (
            <CodeBlock content={data.automation || "No automation code generated"} isPro={isPro} />
          ) : (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-10 rounded-lg border-2 border-dashed border-gray-300 text-center">
              <Crown className="w-16 h-16 text-amber-500 mx-auto mb-4" />
              <p className="text-xl font-bold mb-2">Automation Code is a Pro Feature</p>
              <p className="text-gray-600 mb-6">Upgrade to access full automation code generation</p>
              <ProFeature>
                <Button size="lg" className="px-8">
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Pro
                </Button>
              </ProFeature>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* QA Suite Section */}
      <div className="mt-16 pt-16 border-t">
        <QASuite data={data} />
      </div>

{/*      /!* ===================== OUTPUT EXPANSION (Warp 2) ===================== *!/*/}
{/*      <div className="mt-20 space-y-20">*/}
{/*        */}
{/*        /!* ---------------- SELECTORS ---------------- *!/*/}
{/*        <motion.div id="selectors" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>*/}
{/*          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">*/}
{/*            <MousePointer2 className="w-5 h-5 text-indigo-600" /> Detected Selectors (Mocked)*/}
{/*          </h2>*/}
{/*          <div className="space-y-3 p-4 border rounded-xl bg-white">*/}
{/*            <p className="font-medium">URL: https://example.com/login</p>*/}
{/*            <div className="grid grid-cols-2 gap-4 mt-4">*/}
{/*              <div className="p-3 border rounded bg-gray-50">*/}
{/*                <strong>Email Field:</strong> #email*/}
{/*              </div>*/}
{/*              <div className="p-3 border rounded bg-gray-50">*/}
{/*                <strong>Password Field:</strong> input[name=password]*/}
{/*              </div>*/}
{/*              <div className="p-3 border rounded bg-gray-50">*/}
{/*                <strong>Submit Button:</strong> button[type=submit]*/}
{/*              </div>*/}
{/*              <div className="p-3 border rounded bg-gray-50">*/}
{/*                <strong>Error Banner:</strong> .error-banner*/}
{/*              </div>*/}
{/*            </div>*/}
{/*          </div>*/}
{/*        </motion.div>*/}

{/*        /!* ---------------- PAGE OBJECT MODEL ---------------- *!/*/}
{/*        <motion.div id="pom" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>*/}
{/*          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">*/}
{/*            <Boxes className="w-5 h-5 text-blue-600" /> Page Object Model (Mocked)*/}
{/*          </h2>*/}
{/*          <pre className="p-4 border rounded-xl bg-white text-sm whitespace-pre-wrap">*/}
{/*{`class LoginPage {*/}
{/*  email() { return "#email"; }*/}
{/*  password() { return "input[name=password]"; }*/}
{/*  submit() { return "button[type=submit]"; }*/}
{/*  errorBanner() { return ".error-banner"; }*/}
{/*}*/}
{/*export default new LoginPage();`}*/}
{/*          </pre>*/}
{/*        </motion.div>*/}

{/*        /!* ---------------- STEP DEFINITIONS ---------------- *!/*/}
{/*        <motion.div id="stepdefs" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>*/}
{/*          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">*/}
{/*            <FileCode className="w-5 h-5 text-purple-600" /> Step Definitions (Playwright + Cucumber)*/}
{/*          </h2>*/}
{/*          <pre className="p-4 border rounded-xl bg-white text-sm whitespace-pre-wrap">*/}
{/*{`import { Given, When, Then } from "@cucumber/cucumber";*/}
{/*import LoginPage from "../pages/LoginPage";*/}

{/*Given("User is on login page", async () => {*/}
{/*  await page.goto("https://example.com/login");*/}
{/*});*/}

{/*When("User submits valid credentials", async () => {*/}
{/*  await page.fill(LoginPage.email(), "test@example.com");*/}
{/*  await page.fill(LoginPage.password(), "password123");*/}
{/*  await page.click(LoginPage.submit());*/}
{/*});*/}

{/*Then("User should be logged in", async () => {*/}
{/*  await expect(page.url()).toContain("/dashboard");*/}
{/*});`}*/}
{/*          </pre>*/}
{/*        </motion.div>*/}

{/*        /!* ---------------- API EXTENDED ---------------- *!/*/}
{/*        <motion.div id="apiExt" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>*/}
{/*          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">*/}
{/*            <Server className="w-5 h-5 text-green-600" /> Extended API Test Suite*/}
{/*          </h2>*/}
{/*          <pre className="p-4 border rounded-xl bg-white whitespace-pre-wrap text-sm">*/}
{/*{`# Login*/}
{/*POST /api/login*/}
{/*STATUS: 200*/}
{/*BODY:*/}
{/*{*/}
{/*  "email": "<valid>",*/}
{/*  "password": "<valid>"*/}
{/*}*/}

{/*ERRORS:*/}
{/*401 → Invalid credentials*/}
{/*429 → Rate limit exceeded`}*/}
{/*          </pre>*/}
{/*        </motion.div>*/}

{/*        /!* ---------------- TEST DATA DICTIONARY ---------------- *!/*/}
{/*        <motion.div id="testdata" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }}>*/}
{/*          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">*/}
{/*            <Code2 className="w-5 h-5 text-blue-500" /> Test Data Dictionary*/}
{/*          </h2>*/}
{/*          <div className="p-4 border rounded-xl bg-white space-y-2">*/}
{/*            <div><strong>Valid Email:</strong> test@example.com</div>*/}
{/*            <div><strong>Invalid Email:</strong> test@.com</div>*/}
{/*            <div><strong>Password Weak:</strong> 12345</div>*/}
{/*            <div><strong>Password Strong:</strong> XyT!293ks9a</div>*/}
{/*            <div><strong>Boundary Age:</strong> 17, 18, 99, 100</div>*/}
{/*          </div>*/}
{/*        </motion.div>*/}

{/*        /!* ---------------- RISK & MISSING COVERAGE ---------------- *!/*/}
{/*        <motion.div id="risk" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5 }}>*/}
{/*          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">*/}
{/*            <Bug className="w-5 h-5 text-red-500" /> Risk & Missing Coverage Analysis*/}
{/*          </h2>*/}
{/*          <div className="p-4 border rounded-xl bg-white space-y-2">*/}
{/*            <div>⚠ Missing negative test for empty email</div>*/}
{/*            <div>⚠ Missing rate-limit behavior test</div>*/}
{/*            <div>⚠ Missing session-expiry handling</div>*/}
{/*            <div>⚠ No multi-role flow tests</div>*/}
{/*          </div>*/}
{/*        </motion.div>*/}

{/*        /!* ---------------- COMPATIBILITY MATRIX ---------------- *!/*/}
{/*        <motion.div id="compat" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.6 }}>*/}
{/*          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">*/}
{/*            <Globe className="w-5 h-5 text-teal-600" /> Compatibility Matrix*/}
{/*          </h2>*/}
{/*          <div className="p-4 border rounded-xl bg-white">*/}
{/*            <table className="w-full text-sm">*/}
{/*              <thead className="bg-gray-50">*/}
{/*                <tr>*/}
{/*                  <th className="p-2 text-left">Platform</th>*/}
{/*                  <th className="p-2 text-left">Status</th>*/}
{/*                  <th className="p-2 text-left">Notes</th>*/}
{/*                </tr>*/}
{/*              </thead>*/}
{/*              <tbody>*/}
{/*                <tr>*/}
{/*                  <td className="p-2">Chrome</td>*/}
{/*                  <td className="p-2">✔ Supported</td>*/}
{/*                  <td className="p-2">Fully tested</td>*/}
{/*                </tr>*/}
{/*                <tr>*/}
{/*                  <td className="p-2">Safari</td>*/}
{/*                  <td className="p-2">⚠ Partial</td>*/}
{/*                  <td className="p-2">Mobile issues possible</td>*/}
{/*                </tr>*/}
{/*                <tr>*/}
{/*                  <td className="p-2">Firefox</td>*/}
{/*                  <td className="p-2">✔ Supported</td>*/}
{/*                  <td className="p-2">Recommended</td>*/}
{/*                </tr>*/}
{/*              </tbody>*/}
{/*            </table>*/}
{/*          </div>*/}
{/*        </motion.div>*/}

{/*      </div>*/}
{/*      /!* ================= END OUTPUT EXPANSION ================= *!/*/}
    </div>
  );
}

function ContentBlock({ content, isPro, language }: any) {
  // Handle different content formats
  const displayContent = typeof content === 'string' 
    ? content 
    : JSON.stringify(content, null, 2);

  const handleCopy = () => {
    copyToClipboard(displayContent);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="relative">
      <ProFeature onClick={handleCopy}>
        <Button 
          size="sm" 
          variant="secondary" 
          className="absolute top-2 right-2 z-10"
          disabled={!isPro}
        >
          <ClipboardCopy className="w-4 h-4 mr-1" /> 
          {isPro ? "Copy" : "Copy (Pro)"}
        </Button>
      </ProFeature>

      <pre className="bg-gray-50 p-6 rounded-lg whitespace-pre-wrap text-sm border pt-12 font-mono">
        {displayContent}
      </pre>
    </div>
  );
}

function CodeBlock({ content, isPro }: any) {
  // Handle different content formats
  const displayContent = typeof content === 'string' 
    ? content 
    : JSON.stringify(content, null, 2);

  const handleCopy = () => {
    copyToClipboard(displayContent);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="relative">
      <ProFeature onClick={handleCopy}>
        <Button 
          size="sm" 
          variant="secondary" 
          className="absolute top-2 right-2 z-10"
          disabled={!isPro}
        >
          <ClipboardCopy className="w-4 h-4 mr-1" /> 
          {isPro ? "Copy" : "Copy (Pro)"}
        </Button>
      </ProFeature>

      <div className="rounded-lg overflow-hidden border pt-8">
        <SyntaxHighlighter
          language="javascript"
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: '1.5rem',
            fontSize: '0.875rem',
            borderRadius: '0.5rem'
          }}
          showLineNumbers
        >
          {displayContent || "// No automation code generated"}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

function ScenariosCards({ scenarios, isPro }: { scenarios: any[], isPro: boolean }) {
  const handleCopyAll = () => {
    const text = scenarios.map((s, i) => {
      if (typeof s === 'string') return `${i + 1}. ${s}`;
      const title = s.title || s.scenario || `Scenario ${i + 1}`;
      const steps = s.steps ? `\nSteps:\n${s.steps.map((step: string, idx: number) => `  ${idx + 1}. ${step}`).join('\n')}` : '';
      return `${i + 1}. ${title}${steps}`;
    }).join('\n\n');
    
    copyToClipboard(text);
    toast.success("All scenarios copied to clipboard!");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-600">{scenarios.length} test scenarios generated</p>
        <ProFeature onClick={handleCopyAll}>
          <Button 
            size="sm" 
            variant="secondary"
            disabled={!isPro}
          >
            <ClipboardCopy className="w-4 h-4 mr-1" /> 
            {isPro ? "Copy All" : "Copy All (Pro)"}
          </Button>
        </ProFeature>
      </div>

      <div className="grid gap-4">
        {scenarios.map((scenario: any, index: number) => {
          const isString = typeof scenario === 'string';
          const title = isString ? scenario : (scenario.title || scenario.scenario || `Scenario ${index + 1}`);
          const steps = !isString && scenario.steps ? scenario.steps : [];

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="bg-white border rounded-xl p-6 hover:shadow-md transition"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-blue-600" />
                    {title}
                  </h4>
                  {steps.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase">Steps:</p>
                      <ol className="space-y-1.5">
                        {steps.map((step: string, idx: number) => (
                          <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="text-blue-600 font-mono text-xs mt-0.5">{idx + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
