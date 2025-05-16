import { useState } from "react";
import { ConnectWalletButton } from "./ConnectWalletButton";
import { ExplanationScreen } from "./ExplanationScreen";
import { CheckCircleIcon, CircleDotIcon, HelpCircleIcon, InfoIcon, XCircleIcon } from "lucide-react";
import { useAccount, useSwitchChain } from "wagmi";
import { Alert, AlertDescription } from "~~/components/ui/alert";
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
  const [showExplanation, setShowExplanation] = useState(false);

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

  const handleExplanationClose = () => {
    setShowExplanation(false);
  };

  return (
    <div className="relative">
      <div className="opacity-50">{children}</div>
      <div className={cn("fixed -inset-4 flex items-center justify-center backdrop-blur-sm z-10", className)}>
        <div className="w-[29rem] rounded-lg bg-black px-6 py-4 text-lg font-medium text-neutral-50 shadow-lg flex flex-col items-center gap-4">
          {/* Wallet Disconnected State */}
          {contentState === "wallet-disconnected" && (
            <>
              <div className="text-center">Connect MetaMask wallet</div>
              <div className="w-full flex justify-center">
                <div className="w-full max-w-xs">
                  <ConnectWalletButton />
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1 mt-2 text-sm text-muted-foreground"
                onClick={() => setShowExplanation(true)}
              >
                <HelpCircleIcon className="h-4 w-4" />
                Need help setting up?
              </Button>
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

                {/* Context-specific tip */}
                {(!isSupportedChainSelected || !isAbleToRequestWalletChain) && (
                  <Alert variant="info">
                    <InfoIcon className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="text-xs">
                        <li>For User 1 - Click Authorize button and then &apos;Use Chain A&apos; button</li>
                        <li>
                          For User 2 - After{" "}
                          <a
                            href="https://chain-b-block-explorer.zksync.dev/login"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold underline"
                          >
                            authorizing
                          </a>{" "}
                          via Block Explorer, ensure &apos;Chain B&apos; is selected in MetaMask
                        </li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {isSupportedChainSelected &&
                  isAbleToRequestWalletChain &&
                  !hasChain1RpcConnection &&
                  chainId === chain1.id && (
                    <Alert variant="info">
                      <InfoIcon className="h-4 w-4" />
                      <AlertDescription>
                        {chainId === chain1.id ? (
                          <span className="text-xs">
                            Add or switch MetaMask network by clicking &quot;Use Chain A&quot; button above
                          </span>
                        ) : (
                          <span className="text-xs">
                            Authorize in-app RPC connection by clicking Authorize button above
                          </span>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-1 text-sm text-muted-foreground"
                  onClick={() => setShowExplanation(true)}
                >
                  <HelpCircleIcon className="h-4 w-4" />
                  See detailed setup instructions
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {showExplanation && <ExplanationScreen onClose={handleExplanationClose} isFirstVisit={false} />}
    </div>
  );
}
