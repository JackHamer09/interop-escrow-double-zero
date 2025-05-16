"use client";

import React, { useEffect, useState } from "react";
import { ExplanationScreen } from "./ExplanationScreen";

interface FirstVisitExplanationProps {
  children: React.ReactNode;
}

export const FirstVisitExplanation: React.FC<FirstVisitExplanationProps> = ({ children }) => {
  const [showExplanation, setShowExplanation] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    const hasSeenExplanation = localStorage.getItem("explanationShown");
    if (!hasSeenExplanation) {
      setShowExplanation(true);
      setIsFirstVisit(true);
    } else {
      setIsFirstVisit(false);
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
      {showExplanation && <ExplanationScreen onClose={handleClose} isFirstVisit={isFirstVisit} />}
    </>
  );
};
