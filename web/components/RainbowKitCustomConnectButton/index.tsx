"use client";

// @refresh reset
import { Balance } from "../Balance";
import { Button } from "../ui/button";
import { AddressInfoDropdown } from "./AddressInfoDropdown";
import { WrongNetworkDropdown } from "./WrongNetworkDropdown";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Address } from "viem";
import { env } from "~~/utils/env";

/**
 * Custom Wagmi Connect Button (watch balance + custom design)
 */
export const RainbowKitCustomConnectButton = () => {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;

        return (
          <>
            {(() => {
              if (!connected) {
                return (
                  <Button className="min-h-[42px] h-[42px]" onClick={openConnectModal} type="button">
                    Connect Wallet
                  </Button>
                );
              }

              if (chain.unsupported || chain.id !== env.NEXT_PUBLIC_CHAIN_ID) {
                return <WrongNetworkDropdown />;
              }

              return (
                <div className="flex items-center">
                  <div className="flex flex-col items-center mr-2">
                    <Balance address={account.address as Address} className="min-h-0 h-auto mr-2" />
                    <span className="text-xs">{chain.name}</span>
                  </div>
                  <AddressInfoDropdown address={account.address as Address} ensAvatar={account.ensAvatar} />
                </div>
              );
            })()}
          </>
        );
      }}
    </ConnectButton.Custom>
  );
};
