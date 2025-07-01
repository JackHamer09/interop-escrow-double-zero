import { useState } from "react";
import { ConnectWalletButton } from "./ConnectWalletButton";
import { ExplanationScreen } from "./ExplanationScreen";
import { CheckCircleIcon, CircleDotIcon, HelpCircleIcon, InfoIcon, XCircleIcon } from "lucide-react";
import { useAccount, useSwitchChain } from "wagmi";
import { Alert, AlertDescription } from "~~/components/ui/alert";
import { Button } from "~~/components/ui/button";
import { chain1, chain2, chain3, getChainById } from "~~/config/chains-config";
import { useConnectionStatus } from "~~/hooks/use-connection-status";
import { useRpcLogin } from "~~/hooks/use-rpc-login";
import { cn } from "~~/utils/cn";

type ContentState = "connected" | "wallet-disconnected" | "connection-issues";

export default function HiddenContent({ children, className }: { children: React.ReactNode; className?: string }) {
  const {
    isWalletConnected,
    isAbleToRequestWalletChain,
    hasChain1RpcConnection,
    hasChainCRpcConnection,
    isSupportedChainSelected,
  } = useConnectionStatus();
  const { isRpcAuthenticated, login, saveChainToWallet, loginToChainC, saveChainCToWallet, isChainCAuthenticated } =
    useRpcLogin();
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [showExplanation, setShowExplanation] = useState(false);

  const handleAuthorizeChainA = async () => {
    try {
      await login();
    } catch (error) {
      console.error("Failed to authorize Chain A:", error);
    }
  };

  const handleAuthorizeChainC = async () => {
    try {
      await loginToChainC();
    } catch (error) {
      console.error("Failed to authorize Chain C:", error);
    }
  };

  const useChain1InWallet = async () => {
    try {
      if (!hasChain1RpcConnection) {
        throw new Error(`${chain1.name} RPC wasn't authorized`);
      }
      if (!isRpcAuthenticated) {
        // This means user has authorized chain A in their wallet and we just need to switch it
        await switchChainAsync({ chainId: chain1.id });
      } else {
        await saveChainToWallet();
      }
    } catch (error) {
      console.error("Failed to use Chain A in wallet:", error);
    }
  };

  const useChain3InWallet = async () => {
    try {
      if (!hasChainCRpcConnection) {
        throw new Error(`${chain3.name} RPC wasn't authorized`);
      }
      if (!isChainCAuthenticated) {
        // This means user has authorized chain C in their wallet and we just need to switch it
        await switchChainAsync({ chainId: chain3.id });
      } else {
        await saveChainCToWallet();
      }
    } catch (error) {
      console.error("Failed to use Chain C in wallet:", error);
    }
  };

  // Determine the current state of the content
  const getContentState = (): ContentState => {
    if (!isWalletConnected) {
      return "wallet-disconnected";
    }

    if (isAbleToRequestWalletChain && hasChain1RpcConnection && hasChainCRpcConnection && isSupportedChainSelected) {
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
    if (!chainId) return undefined;
    return getChainById(chainId)?.name;
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

                {/* Chain3 connection status */}
                <div className="flex items-center gap-5 justify-between text-sm">
                  <span>{chain3.name} connection:</span>
                  <div className="flex items-center gap-1">
                    {renderConnectionStatusIndicator(hasChainCRpcConnection ? "connected" : "not-connected")}
                    <span className="text-xs">{hasChainCRpcConnection ? "Connected" : "No access"}</span>
                  </div>
                </div>

                {/* Authorization buttons */}
                <div className="flex flex-col gap-2 mt-2">
                  {!hasChain1RpcConnection ? (
                    <Button onClick={handleAuthorizeChainA} className="w-full h-10">
                      Authorize {chain1.name} RPC in the app
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={useChain1InWallet} className="w-full h-10">
                      Use {chain1.name} in connected MetaMask
                    </Button>
                  )}

                  {!hasChainCRpcConnection ? (
                    <Button onClick={handleAuthorizeChainC} className="w-full h-10">
                      Authorize {chain3.name} RPC in the app
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={useChain3InWallet} className="w-full h-10">
                      Use {chain3.name} in connected MetaMask
                    </Button>
                  )}
                </div>

                {/* Context-specific tip */}
                {(!isSupportedChainSelected || !isAbleToRequestWalletChain) && (
                  <Alert variant="info">
                    <InfoIcon className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="text-xs">
                        <li>
                          Authorize both {chain1.name} and {chain3.name} RPC connections for full functionality
                        </li>
                        <li>{chain1.name} is required for escrow and repo contracts</li>
                        <li>{chain3.name} is required for invoice contracts</li>
                        <li>
                          For Chain B access - Authorize via{" "}
                          <a
                            href={`${chain2.blockExplorers.default.url}/login`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold underline"
                          >
                            Block Explorer
                          </a>{" "}
                          and select &apos;Chain B&apos; in MetaMask
                        </li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {isSupportedChainSelected &&
                  isAbleToRequestWalletChain &&
                  (!hasChain1RpcConnection || !hasChainCRpcConnection) && (
                    <Alert variant="info">
                      <InfoIcon className="h-4 w-4" />
                      <AlertDescription>
                        <span className="text-xs">
                          {!hasChain1RpcConnection && !hasChainCRpcConnection
                            ? `Authorize both ${chain1.name} and ${chain3.name} RPC connections using buttons above`
                            : !hasChain1RpcConnection
                              ? `Authorize ${chain1.name} RPC connection using button above`
                              : `Authorize ${chain3.name} RPC connection using button above`}
                        </span>
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
