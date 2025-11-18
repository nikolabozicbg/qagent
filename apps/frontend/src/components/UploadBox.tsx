"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useUsageLimit, useSubscription } from "@/hooks/useSubscription";
import { Upload, FileText, Crown } from "lucide-react";
import ProModal from "./subscription/ProModal";
import { uploadFile, generateSuite } from "@/lib/api";

export default function UploadBox() {
  const [file, setFile] = useState<File | null>(null);
  const [inputText, setInputText] = useState("");
  const [step, setStep] = useState("");
  const [loading, setLoading] = useState(false);
  const [showProModal, setShowProModal] = useState(false);

  const { count, MAX_FREE, increment, canUse, isClient } = useUsageLimit();
  const { isPro } = useSubscription();
  const router = useRouter();

  const generate = async () => {
    if (!isPro && !canUse) {
      setShowProModal(true);
      return;
    }

    if (!file && inputText.trim().length === 0) {
      toast.error("No input provided", {
        description: "Upload a file or describe the feature to test."
      });
      return;
    }

    try {
      setLoading(true);

      if (!isPro) increment();

      let extractedText = "";

      // If file was uploaded → extract
      if (file) {
        setStep("Extracting from document...");
        extractedText = await uploadFile(file);
      }

      // Combine file text + manual text
      const finalText = `${extractedText}\n\n${inputText}`.trim();

      setStep("Generating your test suite...");
      const result = await generateSuite(finalText);

      toast.success("Complete!", { description: "Your test suite is ready." });
      
      // Store result in sessionStorage and navigate to result page
      sessionStorage.setItem('qagent_result', JSON.stringify(result));
      router.push(`/result`);
    } catch (err: any) {
      toast.error("Error", {
        description: err.response?.data?.message || err.message
      });
    } finally {
      setLoading(false);
      setStep("");
    }
  };

  return (
      <>
        <div className="flex flex-col items-center space-y-6 mt-4 w-full">

          {/* Free usage counter */}
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

          {/* File upload */}
          <div className="w-full max-w-md">
            <Input
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="cursor-pointer"
            />
          </div>

          {/* File info */}
          {file && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText className="w-4 h-4" />
                <span>{file.name}</span>
                <span className="text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
          )}

          {/* Manual text input */}
          <div className="w-full max-w-md">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Or describe the feature to test
            </label>
            <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={5}
                placeholder="E.g. 'User login, MFA, validation, forgot-password flow…'"
                className="w-full"
            />
          </div>

          {/* Loading indicator */}
          {loading && step && (
              <p className="text-gray-600 text-sm animate-pulse">{step}</p>
          )}

          {/* Generate button */}
          <Button
              onClick={generate}
              disabled={loading || (!file && inputText.trim() === "")}
              size="lg"
              className="px-10"
          >
            {loading ? "Processing..." : (
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
