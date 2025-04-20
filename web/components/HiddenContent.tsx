import { useState } from "react";
import { LockIcon, NetworkIcon } from "lucide-react";
import { Button } from "~~/components/ui/button";
import { useConnectionStatus } from "~~/hooks/use-connection-status";
import { useRpcLogin } from "~~/hooks/use-rpc-login";
import { cn } from "~~/utils/cn";

export default function HiddenContent({ children, className }: { children: React.ReactNode; className?: string }) {
  const { isConnected } = useConnectionStatus();
  const { isRpcAuthenticated, login, fullRpcUrl, switchOrAddChain } = useRpcLogin();

  const [showContinue, setShowContinue] = useState(false);

  const handleAuthorize = async () => {
    await login();
    setShowContinue(true);
  };

  const message = !isConnected
    ? "Connect your wallet to start"
    : !isRpcAuthenticated
      ? "Please authorize the RPC connection to continue"
      : "Connected and authorized";

  if (isConnected && isRpcAuthenticated && !showContinue) return children;

  return (
    <div className="relative">
      <div className="opacity-50">{children}</div>
      <div className={cn("fixed -inset-4 flex items-center justify-center backdrop-blur-sm z-10", className)}>
        <div className="rounded-lg bg-black px-6 py-4 text-lg font-medium text-neutral-50 shadow-lg flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <LockIcon className="w-5 h-5" />
            {message}
          </div>

          {!isRpcAuthenticated && isConnected && (
            <Button onClick={handleAuthorize} className="w-full h-10 mt-2">
              Authorize RPC
            </Button>
          )}

          {isRpcAuthenticated && showContinue && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <NetworkIcon className="w-4 h-4" />
                <span className="text-sm">RPC Authorized: {fullRpcUrl}</span>
              </div>
              <div className="flex w-full gap-4 mt-2">
                <Button variant="secondary" onClick={() => switchOrAddChain()} className="h-10">
                  Add chain to wallet
                </Button>
                <Button onClick={() => setShowContinue(false)} className="h-10">
                  Continue
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
