"use client";

import React, { forwardRef } from "react";
import { CheckIcon } from "lucide-react";
import { cn } from "~~/utils/cn";

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = forwardRef<HTMLDivElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, id }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "h-5 w-5 shrink-0 rounded-sm border border-primary shadow cursor-pointer",
          checked ? "bg-primary text-primary-foreground" : "bg-background",
          className,
        )}
        onClick={() => onCheckedChange && onCheckedChange(!checked)}
        id={id}
      >
        {checked && (
          <div className="flex h-full items-center justify-center">
            <CheckIcon className="h-4 w-4 text-white" />
          </div>
        )}
      </div>
    );
  },
);

Checkbox.displayName = "Checkbox";
