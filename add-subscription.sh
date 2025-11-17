#!/bin/bash

cd "$(dirname "$0")/apps/frontend" || exit 1

echo "🚀 Adding QAgent Mock Subscription System..."

mkdir -p src/components/subscription
mkdir -p src/hooks

###############################################################################
# 1. HARD-CODED SUBSCRIPTION STATE (isPro=false)
###############################################################################

cat > src/hooks/useSubscription.ts << 'EOF'
import { useState } from "react";

/**
 * This is MOCK subscription state.
 * In real version → replace with Stripe + Auth backend logic.
 */
export function useSubscription() {
  // CHANGE TO true WHEN DEMOING PRO VERSION
  const [isPro] = useState(false);

  return { isPro };
}
EOF

###############################################################################
# 2. PRO-UPGRADE MODAL (email capture instead of stripe)
###############################################################################

cat > src/components/subscription/ProModal.tsx << 'EOF'
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
            Unlock QAgent Pro
          </DialogTitle>
          <DialogDescription>
            Get access to premium features and unlimited generations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-gray-600 font-semibold">Pro version includes:</p>

          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-sm">
              <Check className="w-4 h-4 text-green-500 mt-0.5" />
              <span>Unlimited AI generations</span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <Check className="w-4 h-4 text-green-500 mt-0.5" />
              <span>Copy to clipboard</span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <Check className="w-4 h-4 text-green-500 mt-0.5" />
              <span>Export as JSON / TXT</span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <Check className="w-4 h-4 text-green-500 mt-0.5" />
              <span>Full automation code suite</span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <Check className="w-4 h-4 text-green-500 mt-0.5" />
              <span>Priority email support</span>
            </li>
          </ul>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-900 font-medium mb-2">
              🎉 Pro is launching soon!
            </p>
            <p className="text-xs text-blue-700">
              Join the early access list to be notified when it's ready.
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
# 3. PRO FEATURE WRAPPER
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
        <div 
          onClick={() => {
            setOpen(true);
          }} 
          className="cursor-pointer"
        >
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
# 4. UPDATE RESULT PAGE WITH PAYWALL
###############################################################################

echo "⚙️  Updating result page with paywall gating..."

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
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <Crown className="w-4 h-4" />
            <span>Free Version</span>
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
            <div className="bg-gray-100 p-10 rounded-lg border text-center">
              <Crown className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <p className="text-lg font-semibold mb-2">Automation Code is a Pro Feature</p>
              <p className="text-gray-600 mb-4">Upgrade to access full automation code generation</p>
              <ProFeature>
                <Button>Upgrade to Pro</Button>
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
echo "✅ Mock Subscription System added!"
echo ""
echo "Features:"
echo "  ✅ Paywall gating for Pro features"
echo "  ✅ Pro modal with email capture"
echo "  ✅ Hardcoded: isPro=false (change in useSubscription.ts)"
echo "  ✅ Export buttons (JSON/TXT) → Pro only"
echo "  ✅ Copy to clipboard → Pro only"
echo "  ✅ Automation tab → Pro only"
echo ""
echo "To enable Pro mode for demo:"
echo "  Edit: src/hooks/useSubscription.ts"
echo "  Change: const [isPro] = useState(false) → useState(true)"
echo ""
