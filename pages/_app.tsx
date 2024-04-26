import type { AppProps } from "next/app";
import Layout from "../components/Layout";
import { AliasesProvider } from "../context/aliases";
import { ContractsProvider } from "../context/contracts";
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
              <ContractsProvider>
                <Layout Component={Component} pageProps={pageProps} />
              </ContractsProvider>
            </P2PProvider>
          </AliasesProvider>
        </AppStateProvider>
      </WalletProvider>
    </TezosToolkitProvider>
  );
}
