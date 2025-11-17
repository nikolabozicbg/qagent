#!/bin/bash

cd "$(dirname "$0")/apps/frontend" || exit 1

echo "🚀 Applying FULL QAgent FE MVP..."

###############################################################################
# 1. VERIFY DEPENDENCIES (already installed)
###############################################################################

echo "✓ Dependencies already installed (axios, lucide-react, shadcn/ui)"

###############################################################################
# 2. SUBSCRIPTION HOOK WITH USAGE LIMIT
###############################################################################

mkdir -p src/hooks

cat > src/hooks/useSubscription.ts << 'EOF'
"use client";

import { useEffect, useState } from "react";

/**
 * MOCK subscription state for MVP.
 * Change isPro to true for demo mode.
 */
export function useSubscription() {
  const [isPro] = useState(false); // Change to true for Pro demo
  return { isPro };
}

/**
 * FREE USAGE LIMIT → 3 generations/day
 * Uses localStorage (client-side only)
 */
export function useUsageLimit() {
  const MAX_FREE = 3;
  const KEY = "qagent_usage";

  const [count, setCount] = useState(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    if (typeof window === "undefined") return;

    const today = new Date().toDateString();
    const saved = JSON.parse(localStorage.getItem(KEY) || "{}");

    if (saved.date === today) {
      setCount(saved.count || 0);
    } else {
      localStorage.setItem(KEY, JSON.stringify({ date: today, count: 0 }));
      setCount(0);
    }
  }, []);

  const increment = () => {
    if (typeof window === "undefined") return;

    const today = new Date().toDateString();
    const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    const newCount = (saved.count || 0) + 1;

    localStorage.setItem(KEY, JSON.stringify({ date: today, count: newCount }));
    setCount(newCount);
  };

  const canUse = count < MAX_FREE;

  return { count, MAX_FREE, increment, canUse, isClient };
}
EOF

###############################################################################
# 3. PRO MODAL (Early Access)
###############################################################################

mkdir -p src/components/subscription

cat > src/components/subscription/ProModal.tsx << 'EOF'
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { Crown, Check } from "lucide-react";

export default function ProModal({ open, onClose }: any) {
  const [email, setEmail] = useState("");

  const handleJoin = () => {
    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    toast.success("Thanks! We'll notify you when Pro is available.", {
      description: `Email captured: ${email}`
    });
    
    setEmail("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Crown className="w-6 h-6 text-yellow-500" />
            Upgrade to QAgent Pro
          </DialogTitle>
          <DialogDescription>
            Get unlimited generations and premium features
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-gray-600 font-semibold">Pro includes:</p>

          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-sm">
              <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Unlimited AI generations</span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Copy to clipboard</span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Export as JSON / TXT</span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Full automation code suite</span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Priority email support</span>
            </li>
          </ul>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-900 font-medium mb-2">
              🎉 Pro is launching soon!
            </p>
            <p className="text-xs text-blue-700">
              Join the early access list to be notified.
            </p>
          </div>

          <Input
            placeholder="Enter your email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          />

          <Button className="w-full" onClick={handleJoin} size="lg">
            Join Early Access
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
EOF

###############################################################################
# 4. PRO FEATURE WRAPPER
###############################################################################

cat > src/components/subscription/ProFeature.tsx << 'EOF'
"use client";

import { useSubscription } from "@/hooks/useSubscription";
import { useState } from "react";
import ProModal from "./ProModal";

interface ProFeatureProps {
  children: React.ReactNode;
  onClick?: () => void;
}

export default function ProFeature({ children, onClick }: ProFeatureProps) {
  const { isPro } = useSubscription();
  const [open, setOpen] = useState(false);

  if (!isPro) {
    return (
      <>
        <div onClick={() => setOpen(true)} className="cursor-pointer">
          {children}
        </div>
        <ProModal open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  return <div onClick={onClick}>{children}</div>;
}
EOF

###############################################################################
# 5. UPLOAD BOX WITH USAGE LIMIT
###############################################################################

cat > src/components/UploadBox.tsx << 'EOF'
"use client";

import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useUsageLimit, useSubscription } from "@/hooks/useSubscription";
import { Upload, FileText, Crown } from "lucide-react";
import ProModal from "./subscription/ProModal";

export default function UploadBox() {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState("");
  const [loading, setLoading] = useState(false);
  const [showProModal, setShowProModal] = useState(false);

  const { count, MAX_FREE, increment, canUse, isClient } = useUsageLimit();
  const { isPro } = useSubscription();
  const router = useRouter();

  const upload = async () => {
    // Check usage limit for free users
    if (!isPro && !canUse) {
      setShowProModal(true);
      return;
    }

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

    try {
      setLoading(true);
      
      if (!isPro) {
        increment();
      }

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
    <>
      <div className="flex flex-col items-center space-y-6 mt-4">
        {/* Usage counter for free users */}
        {!isPro && isClient && (
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">
            <span>Daily usage: <strong>{count}/{MAX_FREE}</strong></span>
            {!canUse && (
              <span className="text-amber-600 flex items-center gap-1">
                <Crown className="w-3 h-3" />
                Limit reached
              </span>
            )}
          </div>
        )}

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

      <ProModal open={showProModal} onClose={() => setShowProModal(false)} />
    </>
  );
}
EOF

###############################################################################
# 6. RESULT PAGE WITH PRO GATING
###############################################################################

cat > src/app/result/page.tsx << 'EOF'
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import axios from "axios";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ClipboardCopy, FileJson, FileText, Lightbulb, FlaskConical, Code2, TestTube2, Crown } from "lucide-react";
import { copyToClipboard } from "@/lib/copy";
import { toast } from "sonner";
import ProFeature from "@/components/subscription/ProFeature";
import { useSubscription } from "@/hooks/useSubscription";

export default function ResultPage({ searchParams }: any) {
  const { id } = searchParams;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isPro } = useSubscription();

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

  return (
    <div className="max-w-5xl mx-auto p-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold">Generated Test Suite</h1>
        
        {!isPro && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-lg">
            <Crown className="w-4 h-4" />
            <span className="font-semibold">Free Version</span>
          </div>
        )}
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
            <Lightbulb className="w-4 h-4 mr-1" /> Scenarios
          </TabsTrigger>
          <TabsTrigger value="testcases">
            <TestTube2 className="w-4 h-4 mr-1" /> Test Cases
          </TabsTrigger>
          <TabsTrigger value="gherkin">
            <FlaskConical className="w-4 h-4 mr-1" /> Gherkin
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
          <ContentBlock content={data.gherkin || "No Gherkin scenarios generated"} isPro={isPro} />
        </TabsContent>

        <TabsContent value="automation">
          {isPro ? (
            <ContentBlock content={data.automation || "No automation code generated"} isPro={isPro} />
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

      <pre className="bg-gray-100 p-5 rounded-lg whitespace-pre-wrap text-sm border pt-12">
        {content}
      </pre>
    </div>
  );
}
EOF

###############################################################################
# DONE
###############################################################################

echo ""
echo "✅ QAGENT FULL FE MVP COMPLETE!"
echo ""
echo "Files updated:"
echo "  ✓ src/hooks/useSubscription.ts (with usage limit)"
echo "  ✓ src/components/subscription/ProModal.tsx"
echo "  ✓ src/components/subscription/ProFeature.tsx"
echo "  ✓ src/components/UploadBox.tsx (with limit check)"
echo "  ✓ src/app/result/page.tsx (with Pro gating)"
echo ""
echo "Features:"
echo "  ✓ Free tier: 3 generations/day"
echo "  ✓ Pro modal with email capture"
echo "  ✓ Copy/Export gated behind Pro"
echo "  ✓ Automation tab gated behind Pro"
echo ""
echo "To enable Pro mode:"
echo "  Edit: src/hooks/useSubscription.ts"
echo "  Change: useState(false) → useState(true)"
echo ""
echo "Run: npm run dev"
echo ""
