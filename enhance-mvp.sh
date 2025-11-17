#!/bin/bash

cd "$(dirname "$0")/apps/frontend" || exit 1

echo "🚀 Upgrading QAgent FE with full MVP features..."

###############################################################################
# 1. ADD COPY-TO-CLIPBOARD UTILITY
###############################################################################

echo "📦 Adding utilities..."

mkdir -p src/lib

cat > src/lib/copy.ts << 'EOF'
export function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}
EOF

###############################################################################
# 2. UPDATE RESULT PAGE – ADD COPY BUTTONS + EXPORT + ICON TABS + BETTER UI
###############################################################################

cat > src/app/result/page.tsx << 'EOF'
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import axios from "axios";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/copy";
import { toast } from "sonner";
import { Download, ClipboardCopy, FileJson, FileText, Lightbulb, FlaskConical, Code2, TestTube2 } from "lucide-react";

export default function ResultPage({ searchParams }: any) {
  const { id } = searchParams;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    
    axios
      .get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/result/${id}`)
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="p-20 text-xl text-center">Generating test suite, please wait...</div>;
  if (error) return <div className="p-20 text-xl text-center text-red-500">Error: {error}</div>;
  if (!data) return <div className="p-20 text-xl text-center">No data found</div>;

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "qagent-output.json";
    a.click();
    
    toast.success("Exported as JSON");
  };

  const exportTxt = () => {
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

  return (
    <div className="max-w-5xl mx-auto p-10 space-y-6">
      <h1 className="text-4xl font-bold">Generated Test Suite</h1>

      <div className="flex gap-4">
        <Button onClick={exportJson} variant="outline"><FileJson className="w-4 h-4 mr-2" /> Export JSON</Button>
        <Button onClick={exportTxt} variant="outline"><FileText className="w-4 h-4 mr-2" /> Export TXT</Button>
      </div>

      <Tabs defaultValue="scenarios" className="space-y-6">
        <TabsList>
          <TabsTrigger value="scenarios"><Lightbulb className="w-4 h-4 mr-1" /> Scenarios</TabsTrigger>
          <TabsTrigger value="testcases"><TestTube2 className="w-4 h-4 mr-1" /> Test Cases</TabsTrigger>
          <TabsTrigger value="gherkin"><FlaskConical className="w-4 h-4 mr-1" /> Gherkin</TabsTrigger>
          <TabsTrigger value="automation"><Code2 className="w-4 h-4 mr-1" /> Automation</TabsTrigger>
        </TabsList>

        <TabsContent value="scenarios">
          <ActionBlock title="Scenarios" content={data.scenarios || "No scenarios generated"} />
        </TabsContent>

        <TabsContent value="testcases">
          <ActionBlock title="Test Cases" content={data.test_cases || "No test cases generated"} />
        </TabsContent>

        <TabsContent value="gherkin">
          <ActionBlock title="Gherkin" content={data.gherkin || "No Gherkin scenarios generated"} />
        </TabsContent>

        <TabsContent value="automation">
          <ActionBlock title="Automation Code" content={data.automation || "No automation code generated"} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ActionBlock({ title, content }: any) {
  const handleCopy = () => {
    copyToClipboard(content);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="relative">
      <Button
        size="sm"
        variant="secondary"
        className="absolute top-2 right-2 z-10"
        onClick={handleCopy}
      >
        <ClipboardCopy className="w-4 h-4 mr-1" /> Copy
      </Button>

      <pre className="bg-gray-100 p-5 rounded-lg whitespace-pre-wrap text-sm border pt-12">
        {content}
      </pre>
    </div>
  );
}
EOF

###############################################################################
# 3. IMPROVED UPLOAD WITH MULTI-STEP LOADING + ERRORS
###############################################################################

cat > src/components/UploadBox.tsx << 'EOF'
"use client";

import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Upload, FileText } from "lucide-react";

export default function UploadBox() {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const upload = async () => {
    try {
      if (!file) {
        toast.error("No file selected", {
          description: "Please choose a PDF, DOCX, or TXT file"
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error("File too large", {
          description: "Maximum file size is 10MB"
        });
        return;
      }

      setLoading(true);

      setStep("Extracting text from document...");
      toast.info("Uploading...", { description: "Extracting content..." });
      
      const form = new FormData();
      form.append("file", file);

      const uploadRes = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/upload`,
        form
      );

      setStep("Generating test scenarios...");
      toast.info("Generating tests...", { description: "This may take a moment..." });
      
      const text = uploadRes.data.text;

      const genRes = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/generate`,
        { text, filename: file.name }
      );

      toast.success("Complete!", { description: "Your test suite is ready." });

      router.push(`/result?id=${genRes.data.id}`);
    } catch (err: any) {
      toast.error("Error during processing", {
        description: err.response?.data?.message || err.message || "Try again or use a different file."
      });
      setLoading(false);
      setStep("");
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6 mt-4">
      <div className="w-full max-w-md">
        <Input
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="cursor-pointer"
        />
      </div>

      {file && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <FileText className="w-4 h-4" />
          <span>{file.name}</span>
          <span className="text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
        </div>
      )}

      {loading && step && (
        <p className="text-gray-600 text-sm animate-pulse">{step}</p>
      )}

      <Button 
        onClick={upload} 
        disabled={loading || !file}
        size="lg"
        className="px-10"
      >
        {loading ? (
          <>Processing...</>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-2" />
            Generate Test Suite
          </>
        )}
      </Button>
    </div>
  );
}
EOF

###############################################################################
# 4. LANDING PAGE — HERO + HOW IT WORKS
###############################################################################

cat > src/app/page.tsx << 'EOF'
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="px-6 py-20 max-w-5xl mx-auto space-y-24">
      <section className="text-center">
        <Image 
          src="/logo.svg" 
          alt="QAgent Logo"
          width={128} 
          height={128} 
          className="mx-auto mb-6" 
        />
        <h1 className="text-6xl font-bold mb-4">QAgent</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Autonomous AI Agent for QA.  
          Upload a specification → Get a full test suite in seconds.
        </p>

        <Link href="/upload">
          <Button size="lg" className="mt-8 px-10 text-lg">
            Try it now
          </Button>
        </Link>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-10">
        <StepCard
          icon="📄"
          title="1. Upload Document"
          desc="PDF, DOCX, TXT… any spec you have"
        />
        <StepCard
          icon="🤖"
          title="2. AI Agent Generates Tests"
          desc="Scenarios, test cases, Gherkin, automation"
        />
        <StepCard
          icon="⚡"
          title="3. Download & Copy"
          desc="Export as JSON/TXT or copy sections"
        />
      </section>

      <section className="text-center">
        <h2 className="text-3xl font-bold mb-4">What You Get</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 text-left">
          <FeatureCard title="Test Scenarios" desc="High-level test scenarios covering all requirements" />
          <FeatureCard title="Test Cases" desc="Detailed test cases with steps and expected results" />
          <FeatureCard title="Gherkin Format" desc="BDD-style scenarios ready for automation frameworks" />
          <FeatureCard title="Automation Code" desc="Ready-to-use automation code snippets" />
        </div>
      </section>
    </main>
  );
}

function StepCard({ icon, title, desc }: any) {
  return (
    <Card className="p-6 text-center hover:shadow-lg transition-shadow">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-600">{desc}</p>
    </Card>
  );
}

function FeatureCard({ title, desc }: any) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-gray-600 text-sm">{desc}</p>
    </div>
  );
}
EOF

echo ""
echo "✅ QAgent FE MVP fully enhanced!"
echo ""
echo "📋 Next steps:"
echo "   1. npm run build (test build)"
echo "   2. npm run dev (start dev server)"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔌 Backend: http://localhost:3001"
echo ""
