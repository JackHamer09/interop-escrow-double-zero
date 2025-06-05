"use client";

import React from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "~~/components/ui/button";

interface RefreshBalancesButtonProps {
  isLoading: boolean;
  onRefresh: () => void;
}

export const RefreshBalancesButton: React.FC<RefreshBalancesButtonProps> = ({ isLoading, onRefresh }) => {
  return (
    <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading} className="flex gap-1 items-center">
      <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
      <span>Refresh</span>
    </Button>
  );
};
