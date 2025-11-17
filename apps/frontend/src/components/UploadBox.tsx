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
