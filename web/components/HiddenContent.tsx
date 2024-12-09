import { LockIcon } from "lucide-react";
import { useAccount } from "wagmi";
import { cn } from "~~/utils/cn";

export default function HiddenContent({ children, className }: { children: React.ReactNode; className?: string }) {
  const { isConnected } = useAccount();

  if (isConnected) {
    return children;
  }

  return (
    <div className="relative">
      <div className="opacity-50">{children}</div>
      <div className={cn("absolute -inset-4 flex items-center justify-center backdrop-blur-sm z-10", className)}>
        <div className="rounded-lg bg-black px-6 py-4 text-lg font-medium text-neutral-50 shadow-lg flex items-center gap-x-2">
          <LockIcon className="w-5 h-5" />
          Connect your wallet to start
        </div>
      </div>
    </div>
  );
}
