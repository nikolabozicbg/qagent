"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardCopy, FileJson, FileText, Lightbulb, FlaskConical, Code2, TestTube2, Crown, Loader2, Sparkles, MousePointer2, Boxes, FileCode, Bug, Globe, Server } from "lucide-react";
import { copyToClipboard } from "@/lib/copy";
import { toast } from "sonner";
import ProFeature from "@/components/subscription/ProFeature";
import { useSubscription } from "@/hooks/useSubscription";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useState } from "react";
import { motion } from "framer-motion";
import QASuite from "@/components/qa-suite/QASuite";

export default function DemoPage() {
  const { isPro } = useSubscription();
  const [refinePrompt, setRefinePrompt] = useState("");
  const [refining, setRefining] = useState(false);

  // MOCK DATA
  const data = {
    scenarios: `Test Scenario 1: User Login
- Verify successful login with valid credentials
- Verify error message with invalid credentials
- Verify password reset functionality

Test Scenario 2: Product Search
- Verify search with valid product name
- Verify search with filters
- Verify empty search results handling`,

    test_cases: `TC-001: Login with Valid Credentials
Steps:
1. Navigate to login page
2. Enter valid username
3. Enter valid password
4. Click Login button
Expected: User successfully logged in and redirected to dashboard

TC-002: Login with Invalid Credentials
Steps:
1. Navigate to login page
2. Enter invalid username
3. Enter invalid password
4. Click Login button
Expected: Error message displayed`,

    gherkin: `Feature: User Authentication
  
  Scenario: Successful login
    Given I am on the login page
    When I enter valid credentials
    And I click the login button
    Then I should be redirected to the dashboard
    
  Scenario: Failed login
    Given I am on the login page
    When I enter invalid credentials
    And I click the login button
    Then I should see an error message`,

    automation: `// Playwright Automation Code
import { test, expect } from '@playwright/test';

test.describe('User Authentication', () => {
  test('successful login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#username', 'testuser');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('failed login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#username', 'invalid');
    await page.fill('#password', 'wrong');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error')).toBeVisible();
  });
});`
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qagent-demo-output.json";
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
    a.download = "qagent-demo-output.txt";
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

    setTimeout(() => {
      setRefining(false);
      toast.success("Test suite refined!", {
        description: "Your improvements have been applied"
      });
      setRefinePrompt("");
    }, 2000);
  };

  const scenarioCount = data.scenarios?.split('\n\n').filter((s: string) => s.trim()).length || 0;
  const testCaseCount = data.test_cases?.split('\n\n').filter((s: string) => s.trim()).length || 0;
  const gherkinCount = data.gherkin?.split('Scenario:').length - 1 || 0;

  return (
    <div className="max-w-6xl mx-auto p-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Generated Test Suite (DEMO)</h1>
          <p className="text-gray-600">AI-powered test generation complete • This is a demo page</p>
        </div>
        
        {!isPro && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-lg">
            <Crown className="w-4 h-4" />
            <span className="font-semibold">Free Version</span>
          </div>
        )}
        
        {isPro && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-4 py-2 rounded-lg">
            <Crown className="w-4 h-4" />
            <span className="font-semibold">Pro Version</span>
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

      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <p className="text-sm text-blue-900">
          💡 <strong>Testing Instructions:</strong> Click on any "(Pro)" button to see the upgrade modal. 
          To enable Pro mode, edit <code className="bg-blue-100 px-1 rounded">src/hooks/useSubscription.ts</code> and change <code className="bg-blue-100 px-1 rounded">isPro</code> to <code className="bg-blue-100 px-1 rounded">true</code>.
        </p>
      </div>

      {/* EXPORT BUTTONS → PRO */}
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
          <ContentBlock content={data.scenarios} isPro={isPro} />
        </TabsContent>

        <TabsContent value="testcases">
          <ContentBlock content={data.test_cases} isPro={isPro} />
        </TabsContent>

        <TabsContent value="gherkin">
          <ContentBlock content={data.gherkin} isPro={isPro} />
        </TabsContent>

        <TabsContent value="automation">
          {isPro ? (
            <CodeBlock content={data.automation} isPro={isPro} />
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

      {/* Enterprise QA Suite */}
      <QASuite />

{/*33*/}
    </div>
  );
}

function ContentBlock({ content, isPro }: any) {
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

      <pre className="bg-gray-100 p-5 rounded-lg whitespace-pre-wrap text-sm border pt-12 font-mono">
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
