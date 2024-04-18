import type { AppProps } from "next/app";
import Layout from "../components/Layout";
import { AliasesProvider } from "../context/aliases";
import { AppStateProvider } from "../context/state";
import { TezosToolkitProvider } from "../context/tezos-toolkit";
import { WalletProvider } from "../context/wallet";
import "../styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <TezosToolkitProvider>
      <WalletProvider>
        <AppStateProvider>
          <AliasesProvider>
            <Layout Component={Component} pageProps={pageProps} />
          </AliasesProvider>
        </AppStateProvider>
      </WalletProvider>
    </TezosToolkitProvider>
  );
}
