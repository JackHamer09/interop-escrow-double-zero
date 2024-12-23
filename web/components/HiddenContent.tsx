import { LockIcon } from "lucide-react";
import { useConnectionStatus } from "~~/hooks/use-connection-status";
import { cn } from "~~/utils/cn";

export default function HiddenContent({ children, className }: { children: React.ReactNode; className?: string }) {
  const { isConnected, walletAndRpcMatch } = useConnectionStatus();

  if (isConnected && walletAndRpcMatch) {
    return children;
  }

  const message = !isConnected
    ? "Connect your wallet to start"
    : "Please ensure that your rpc is the right one for your address";

  return (
    <div className="relative">
      <div className="opacity-50">{children}</div>
      <div className={cn("absolute -inset-4 flex items-center justify-center backdrop-blur-sm z-10", className)}>
        <div className="rounded-lg bg-black px-6 py-4 text-lg font-medium text-neutral-50 shadow-lg flex items-center gap-x-2">
          <LockIcon className="w-5 h-5" />
          {message}
        </div>
      </div>
    </div>
  );
}
