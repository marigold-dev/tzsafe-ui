import type { AppProps } from "next/app";
import Layout from "../components/Layout";
import { AliasesProvider } from "../context/aliases";
import { P2PProvider } from "../context/dapps";
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
            <P2PProvider>
              <Layout Component={Component} pageProps={pageProps} />
            </P2PProvider>
          </AliasesProvider>
        </AppStateProvider>
      </WalletProvider>
    </TezosToolkitProvider>
  );
}
