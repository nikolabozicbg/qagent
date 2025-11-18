"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Sparkles, CheckCircle2 } from "lucide-react";

const TIPS = [
  "🧪 QAgent analyzes your requirements to generate comprehensive test scenarios",
  "🤖 AI is creating negative test cases to catch edge cases",
  "🔒 Security recommendations are being generated for your feature",
  "📊 Boundary value analysis helps identify input validation issues",
  "🎯 Test cases are mapped to requirements for full traceability",
  "⚡ Automation code can save QA teams 50%+ time on test writing",
  "🌐 API test scenarios ensure backend endpoints are fully covered",
  "✨ Gherkin scenarios make tests readable by non-technical stakeholders",
];

interface LoadingScreenProps {
  step: string;
}

export default function LoadingScreen({ step }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [currentTip, setCurrentTip] = useState(0);

  // Simulate progress
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 3;
      });
    }, 300);

    return () => clearInterval(progressInterval);
  }, []);

  // Rotate tips every 4 seconds
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % TIPS.length);
    }, 4000);

    return () => clearInterval(tipInterval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50 z-50 flex items-center justify-center"
    >
      <div className="max-w-2xl w-full px-8">
        {/* Main icon */}
        <motion.div
          className="flex justify-center mb-8"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <div className="relative">
            <Sparkles className="w-20 h-20 text-blue-600" />
            <motion.div
              className="absolute inset-0 bg-blue-400 rounded-full blur-2xl opacity-30"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>

        {/* Status text */}
        <h2 className="text-3xl font-bold text-center mb-3 text-gray-900">
          Generating Your Test Suite
        </h2>
        <p className="text-center text-gray-600 mb-8">
          {step || "Initializing AI..."}
        </p>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-center text-sm text-gray-500 mt-2">
            {Math.round(progress)}% complete
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex justify-center gap-4 mb-10">
          <StepIndicator label="Extract" completed={progress > 20} />
          <StepIndicator label="Analyze" completed={progress > 50} />
          <StepIndicator label="Generate" completed={progress > 80} />
          <StepIndicator label="Format" completed={progress > 95} />
        </div>

        {/* Rotating tips */}
        <motion.div
          key={currentTip}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-white border border-blue-200 rounded-xl p-6 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm">💡</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-1">Did you know?</p>
              <p className="text-sm text-gray-700">{TIPS[currentTip]}</p>
            </div>
          </div>
        </motion.div>

        {/* Spinner */}
        <div className="flex justify-center mt-8">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
      </div>
    </motion.div>
  );
}

function StepIndicator({ label, completed }: { label: string; completed: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
          completed ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
        }`}
        animate={completed ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        {completed ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-2 h-2 bg-gray-400 rounded-full" />}
      </motion.div>
      <p className={`text-xs font-medium ${completed ? "text-gray-900" : "text-gray-500"}`}>
        {label}
      </p>
    </div>
  );
}
