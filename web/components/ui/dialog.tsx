import * as React from "react";
import { X } from "lucide-react";
import { cn } from "~~/utils/cn";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children, className }) => {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={cn("relative bg-background rounded-lg shadow-lg max-h-[85vh] overflow-auto", className)}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
      <div className="fixed inset-0 z-[-1]" onClick={() => onOpenChange(false)} />
    </div>
  );
};

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogContent: React.FC<DialogContentProps> = ({ children, className }) => (
  <div className={cn("p-6", className)}>{children}</div>
);

interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogHeader: React.FC<DialogHeaderProps> = ({ children, className }) => (
  <div className={cn("mb-4", className)}>{children}</div>
);

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogTitle: React.FC<DialogTitleProps> = ({ children, className }) => (
  <h2 className={cn("text-xl font-semibold", className)}>{children}</h2>
);

interface DialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogDescription: React.FC<DialogDescriptionProps> = ({ children, className }) => (
  <p className={cn("text-sm text-muted-foreground mt-1", className)}>{children}</p>
);

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogFooter: React.FC<DialogFooterProps> = ({ children, className }) => (
  <div className={cn("mt-5 flex justify-end gap-3", className)}>{children}</div>
);

interface DialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const DialogClose: React.FC<DialogCloseProps> = ({ asChild, children, ...props }) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
    } as any);
  }

  return (
    <button {...props} className={cn("absolute top-4 right-4", props.className)}>
      {children || <X className="h-4 w-4" />}
    </button>
  );
};
