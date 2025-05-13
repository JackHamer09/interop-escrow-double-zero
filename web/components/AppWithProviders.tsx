"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { Toaster } from "react-hot-toast";
import { WagmiProvider } from "wagmi";
import { Header } from "~~/components/Header";
import { MobileBlocker } from "~~/components/MobileBlocker";
import { PageLoader } from "~~/components/PageLoader";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";

const App = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <div className={`flex flex-col min-h-screen`}>
        <Header />
        <main className="relative flex flex-col flex-1">{children}</main>
      </div>
      <PageLoader />
      <MobileBlocker />
      <Toaster position="bottom-center" />
    </>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

export const AppWithProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ProgressBar height="3px" color="#2299dd" />
        <App>{children}</App>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
