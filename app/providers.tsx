"use client";

import { AuthController } from "@/hooks/AuthController";
import {
  createNetworkConfig,
  SuiClientProvider,
  WalletProvider,
} from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { FC } from "react";
const { networkConfig } = createNetworkConfig({
  localnet: { url: getFullnodeUrl("localnet") },
  mainnet: { url: getFullnodeUrl("mainnet") },
});
const queryClient = new QueryClient();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Providers: FC<any> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider
        networks={networkConfig}
        defaultNetwork="localnet"
      >
        <WalletProvider
          autoConnect={true}
          storageKey="my-app-wallet-connection"
        >
          <AuthController />
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
};

export default Providers;
