"use client";

import React, { useEffect, useState } from "react";
import { ExplanationScreen } from "./ExplanationScreen";

interface FirstVisitExplanationProps {
  children: React.ReactNode;
}

export const FirstVisitExplanation: React.FC<FirstVisitExplanationProps> = ({ children }) => {
  const [showExplanation, setShowExplanation] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const hasSeenExplanation = localStorage.getItem("explanationShown");
    if (!hasSeenExplanation) {
      setShowExplanation(true);
    }
  }, []);

  const handleClose = () => {
    setShowExplanation(false);
    localStorage.setItem("explanationShown", "true");
  };

  // Only show after hydration
  if (!isMounted) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      {showExplanation && <ExplanationScreen onClose={handleClose} />}
    </>
  );
};
