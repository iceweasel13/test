"use client";

import { AuthController } from "@/hooks/AuthController";
import { oceanTheme } from "@/themes/oceanTheme";
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

export const {
  networkConfig,
  useNetworkVariable,
  useNetworkVariables,
} = createNetworkConfig({
  testnet: {
    url: getFullnodeUrl("testnet"),
    variables: {
      puffyPackageId:
        "0x236e6a1deff4be91420d7866bd1da500fd1545f951630a187915a8902c0d1a02",
    },
  },
});
const queryClient = new QueryClient();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Providers: FC<any> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider
        networks={networkConfig}
        defaultNetwork="testnet"
      >
        <WalletProvider
          autoConnect={true}
          storageKey="my-app-wallet-connection"
          theme={oceanTheme}
        >
          <AuthController />

          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
};

export default Providers;
