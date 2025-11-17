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
