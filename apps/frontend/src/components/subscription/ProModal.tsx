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
