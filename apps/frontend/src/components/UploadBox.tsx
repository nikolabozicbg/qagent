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
import LoadingScreen from "./LoadingScreen";
import { uploadFile, generateSuite } from "@/lib/api";

export default function UploadBox() {
  const [file, setFile] = useState<File | null>(null);
  const [inputText, setInputText] = useState("");
  const [step, setStep] = useState("");
  const [loading, setLoading] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const { count, MAX_FREE, increment, canUse, isClient } = useUsageLimit();
  const { isPro } = useSubscription();
  const router = useRouter();

  const ALLOWED_TYPES = ['.pdf', '.docx', '.txt', '.md'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const validateFile = (file: File): string | null => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_TYPES.includes(extension)) {
      return `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size: 5MB`;
    }
    return null;
  };

  const handleFileSelect = (selectedFile: File) => {
    const error = validateFile(selectedFile);
    if (error) {
      setFileError(error);
      setFile(null);
      toast.error('Invalid file', { description: error });
    } else {
      setFileError(null);
      setFile(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

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
      
      // Clear old cache and store fresh result
      sessionStorage.clear();
      sessionStorage.setItem('qagenai_result', JSON.stringify(result));
      sessionStorage.setItem('qagenai_result_timestamp', Date.now().toString());
      router.push(`/result?t=${Date.now()}`);
    } catch (err: any) {
      // Handle rate limit error (429)
      if (err.response?.status === 429) {
        const errorData = err.response.data;
        toast.error(errorData.message || "Daily limit reached", {
          description: errorData.error || "Upgrade to Pro for unlimited access.",
          duration: 10000,
          action: {
            label: "Upgrade to Pro",
            onClick: () => setShowProModal(true),
          },
        });
      } else {
        toast.error("Error", {
          description: err.response?.data?.message || err.message
        });
      }
    } finally {
      setLoading(false);
      setStep("");
    }
  };

  return (
      <>
        {loading && <LoadingScreen step={step} />}
        
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

          {/* Drag & Drop File Upload */}
          <div className="w-full max-w-md">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                isDragging 
                  ? 'border-blue-500 bg-blue-50' 
                  : fileError
                  ? 'border-red-300 bg-red-50'
                  : file
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              }`}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <input
                id="file-input"
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  if (selectedFile) handleFileSelect(selectedFile);
                }}
                className="hidden"
              />
              
              {file ? (
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <FileText className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setFileError(null);
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <Upload className="w-12 h-12 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">
                      {isDragging ? 'Drop file here' : 'Drag & drop file here'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">or click to browse</p>
                  </div>
                  <p className="text-xs text-gray-400">
                    Supported: PDF, DOCX, TXT, MD (max 5MB)
                  </p>
                </div>
              )}
              
              {fileError && (
                <p className="text-sm text-red-600 mt-2">{fileError}</p>
              )}
            </div>
          </div>

          {/* Manual text input */}
          <div className="w-full max-w-md">
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">
                Or describe the feature to test
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setInputText(`E-commerce Checkout Flow:
- User adds items to cart (quantity 1-99)
- User views cart and updates quantities
- User enters shipping address:
  * Name: 2-100 characters
  * Email: valid format, max 255 chars
  * Zip code: 5 digits (US)
- User applies discount code (6-12 alphanumeric)
- User selects shipping method:
  * Standard (3-5 days): $5.99
  * Express (1-2 days): $12.99
- User enters payment:
  * Card: 16 digits
  * CVV: 3-4 digits
  * Expiry: MM/YY
- System validates with Stripe API
- System creates order and sends email

API Endpoints:
- POST /api/cart/add
- GET /api/cart
- POST /api/checkout/validate
- POST /api/payment/process`)}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                ✨ Try Example
              </Button>
            </div>
            <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={5}
                placeholder="E.g. 'User login, MFA, validation, forgot-password flow\u2026'"
                className="w-full"
            />
          </div>

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
