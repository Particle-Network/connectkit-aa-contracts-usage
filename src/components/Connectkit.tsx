"use client";

import React from "react";
import { ConnectKitProvider, createConfig } from "@particle-network/connectkit";
import {
  wallet,
  type EntryPosition,
} from "@particle-network/connectkit/wallet";
import { baseSepolia } from "@particle-network/connectkit/chains";
import { authWalletConnectors } from "@particle-network/connectkit/auth";
import { aa } from "@particle-network/connectkit/aa";

// import {
//   solanaWalletConnectors,
//   injected as solaInjected,
// } from "@particle-network/connectkit/solana";

const config = createConfig({
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID!,
  clientKey: process.env.NEXT_PUBLIC_CLIENT_KEY!,
  appId: process.env.NEXT_PUBLIC_APP_ID!,
  appearance: {
    recommendedWallets: [
      { walletId: "phantom", label: "none" },
      { walletId: "coinbaseWallet", label: "Popular" },
      { walletId: "okxWallet", label: "none" },
      { walletId: "trustWallet", label: "none" },
      { walletId: "bitKeep", label: "none" },
    ],
    splitEmailAndPhone: false,
    collapseWalletList: false,
    hideContinueButton: false,
    connectorsOrder: ["email", "phone", "social", "wallet"],
    language: "en-US",
    collapsePasskeyButton: true,
  },
  walletConnectors: [
    authWalletConnectors({
      authTypes: [
        "google",
        "apple",
        "github",
        "facebook",
        "twitter",
        "microsoft",
        "discord",
        "twitch",
        "linkedin",
        "email",
      ],
      fiatCoin: "USD",
      promptSettingConfig: {
        promptMasterPasswordSettingWhenLogin: 0,
        promptPaymentPasswordSettingWhenSign: 0,
      },
    }),

    // solanaWalletConnectors({
    //   connectorFns: [
    //     solaInjected({ target: "phantom" }),
    //     solaInjected({ target: "coinbaseWallet" }),
    //     solaInjected({ target: "okxWallet" }),
    //     solaInjected({ target: "trustWallet" }),
    //     solaInjected({ target: "bitKeep" }),
    //   ],
    // }),
  ],
  plugins: [
    wallet({
      entryPosition: "bottom-right" as EntryPosition,
      visible: true,
      customStyle: {
        fiatCoin: "USD",
      },
    }),
    // aa config start
    // With Passkey auth use Biconomy or Coinbase
    aa({
      name: "BICONOMY",
      version: "2.0.0",
    }),
    // aa config end
  ],
  chains: [baseSepolia],
});

// Wrap your application with this component.
export const ParticleConnectkit = ({ children }: React.PropsWithChildren) => {
  return <ConnectKitProvider config={config}>{children}</ConnectKitProvider>;
};
