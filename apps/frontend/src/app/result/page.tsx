"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
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

  // Count items in sections
  const scenarioCount = data.scenarios?.split('\n\n').filter((s: string) => s.trim()).length || 0;
  const testCaseCount = data.test_cases?.split('\n\n').filter((s: string) => s.trim()).length || 0;
  const gherkinCount = data.gherkin?.split('Scenario:').length - 1 || 0;

  return (
    <div className="max-w-6xl mx-auto p-10 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Generated Test Suite</h1>
          <p className="text-gray-600">AI-powered test generation complete</p>
        </div>
        
        {!isPro && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-lg">
            <Crown className="w-4 h-4" />
            <span className="font-semibold">Free Version</span>
          </div>
        )}
      </div>

      {/* Metadata Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Document</p>
            <p className="font-semibold">demo-spec.pdf</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Processing Time</p>
            <p className="font-semibold">~8 seconds</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">AI Confidence</p>
            <p className="font-semibold text-green-600">87%</p>
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            💡 <strong>Tip:</strong> Add edge cases or negative test paths for more comprehensive coverage
          </p>
        </div>
      </div>

      {/* Refine Prompt */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-lg">Refine Your Test Suite</h3>
        </div>
        
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
      </div>

      {/* Export Buttons */}
      <div className="flex gap-4">
        <ProFeature onClick={handleExportJson}>
          <Button variant="outline" disabled={!isPro}>
            <FileJson className="w-4 h-4 mr-2" /> 
            Export JSON {!isPro && "(Pro)"}
          </Button>
        </ProFeature>

        <ProFeature onClick={handleExportTxt}>
          <Button variant="outline" disabled={!isPro}>
            <FileText className="w-4 h-4 mr-2" /> 
            Export TXT {!isPro && "(Pro)"}
          </Button>
        </ProFeature>
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
          <ContentBlock content={data.scenarios || "No scenarios generated"} isPro={isPro} />
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
        <QASuite />
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
  const handleCopy = () => {
    copyToClipboard(content);
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
        {content}
      </pre>
    </div>
  );
}

function CodeBlock({ content, isPro }: any) {
  const handleCopy = () => {
    copyToClipboard(content);
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
          {content || "// No automation code generated"}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
