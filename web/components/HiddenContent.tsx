import { ConnectWalletButton } from "./ConnectWalletButton";
import { CheckCircleIcon, CircleDotIcon, XCircleIcon } from "lucide-react";
import { useAccount, useSwitchChain } from "wagmi";
import { Button } from "~~/components/ui/button";
import { useConnectionStatus } from "~~/hooks/use-connection-status";
import { useRpcLogin } from "~~/hooks/use-rpc-login";
import { chain1, chain2 } from "~~/services/web3/wagmiConfig";
import { cn } from "~~/utils/cn";

type ContentState = "connected" | "wallet-disconnected" | "connection-issues";

export default function HiddenContent({ children, className }: { children: React.ReactNode; className?: string }) {
  const { isWalletConnected, isAbleToRequestWalletChain, hasChain1RpcConnection, isSupportedChainSelected } =
    useConnectionStatus();
  const { isRpcAuthenticated, login, saveChainToWallet } = useRpcLogin();
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const handleAuthorize = async () => {
    await login();
  };
  const useChain1InWallet = () => {
    if (!hasChain1RpcConnection) {
      throw new Error(`${chain1.name} RPC wasn't authorized`);
    }
    if (!isRpcAuthenticated) {
      // This means user has authorized chain A in their wallet and we just need to switch it
      switchChainAsync({ chainId: chain1.id });
    } else {
      saveChainToWallet();
    }
  };

  // Determine the current state of the content
  const getContentState = (): ContentState => {
    if (!isWalletConnected) {
      return "wallet-disconnected";
    }

    if (isAbleToRequestWalletChain && hasChain1RpcConnection && isSupportedChainSelected) {
      return "connected";
    }

    return "connection-issues";
  };

  const contentState = getContentState();

  // If everything is connected properly, render the content
  if (contentState === "connected") {
    return children;
  }

  const renderConnectionStatusIndicator = (status: "connected" | "warning" | "not-connected") => {
    switch (status) {
      case "connected":
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case "warning":
        return <CircleDotIcon className="w-4 h-4 text-yellow-500" />;
      case "not-connected":
        return <XCircleIcon className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getCurrentChainName = () => {
    if (chainId === chain1.id) return chain1.name;
    if (chainId === chain2.id) return chain2.name;
    return null;
  };

  return (
    <div className="relative">
      <div className="opacity-50">{children}</div>
      <div className={cn("fixed -inset-4 flex items-center justify-center backdrop-blur-sm z-10", className)}>
        <div className="rounded-lg bg-black px-6 py-4 text-lg font-medium text-neutral-50 shadow-lg flex flex-col items-center gap-4">
          {/* Wallet Disconnected State */}
          {contentState === "wallet-disconnected" && (
            <>
              <div className="text-center">Connect MetaMask wallet to start</div>
              <div className="w-full flex justify-center">
                <div className="w-full max-w-xs">
                  <ConnectWalletButton />
                </div>
              </div>
            </>
          )}

          {/* Connection Issues State */}
          {contentState === "connection-issues" && (
            <>
              <div className="text-center">
                {!isSupportedChainSelected ? "Unsupported chain selected" : "Additional authorization required"}
              </div>

              <div className="w-full mt-2 flex flex-col gap-3">
                {/* Current wallet connection status */}
                <div className="flex items-center gap-5 justify-between text-sm">
                  <span>Connected MetaMask:</span>
                  <div className="flex items-center gap-1">
                    {renderConnectionStatusIndicator(
                      !isAbleToRequestWalletChain
                        ? "not-connected"
                        : !isSupportedChainSelected
                          ? "not-connected"
                          : "connected",
                    )}
                    <span className="text-xs">
                      {!isSupportedChainSelected
                        ? "Unsupported chain selected"
                        : isAbleToRequestWalletChain
                          ? `${getCurrentChainName()} connected`
                          : "Disconnected"}
                    </span>
                  </div>
                </div>

                {/* Chain1 connection status */}
                <div className="flex items-center gap-5 justify-between text-sm">
                  <span>{chain1.name} connection:</span>
                  <div className="flex items-center gap-1">
                    {renderConnectionStatusIndicator(hasChain1RpcConnection ? "connected" : "not-connected")}
                    <span className="text-xs">{hasChain1RpcConnection ? "Connected" : "No access"}</span>
                  </div>
                </div>

                {!hasChain1RpcConnection ? (
                  <Button onClick={handleAuthorize} className="w-full h-10 mt-2">
                    Authorize {chain1.name} RPC in the app
                  </Button>
                ) : (
                  <Button variant="outline" onClick={useChain1InWallet} className="w-full h-10 mt-2">
                    Use {chain1.name} in connected MetaMask
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
