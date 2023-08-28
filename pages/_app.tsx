import {
  AnalyticsInterface,
  BeaconEvent,
  defaultEventCallbacks,
  NetworkType,
  P2PPairingRequest,
  PostMessagePairingRequest,
  WalletConnectPairingRequest,
} from "@airgap/beacon-sdk";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import { BeaconWallet } from "@taquito/beacon-wallet";
import { validateAddress, ValidationResult } from "@taquito/utils";
import type { AppProps } from "next/app";
import { usePathname } from "next/navigation";
import { useRouter } from "next/router";
import { useReducer, useEffect, useState } from "react";
import Banner from "../components/Banner";
import Sidebar from "../components/Sidebar";
import Footer from "../components/footer";
import NavBar from "../components/navbar";
import { PREFERED_NETWORK } from "../context/config";
import {
  tezosState,
  action,
  reducer,
  emptyState,
  init,
  AppStateContext,
  AppDispatchContext,
} from "../context/state";
import "../styles/globals.css";
import { fetchContract, isTzSafeContract } from "../utils/fetchContract";

export default function App({ Component, pageProps }: AppProps) {
  const [state, dispatch]: [tezosState, React.Dispatch<action>] = useReducer(
    reducer,
    emptyState()
  );

  const [hasSidebar, setHasSidebar] = useState(false);

  const path = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!path || !state.currentContract) return;

    if (
      (path === "/" || path === "") &&
      Object.values(state.contracts).length > 0 &&
      !!state.currentContract
    ) {
      router.replace(`/${state.currentContract}/proposals`);
      return;
    }

    if (Object.values(state.contracts).length > 0 && !!state.currentContract)
      return;

    router.replace("/");

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentContract]);

  useEffect(() => {
    (async () => {
      if (!router.query.walletAddress) return;
      if (Array.isArray(router.query.walletAddress)) return;
      if (router.query.walletAddress === state.currentContract) return;

      if (
        validateAddress(router.query.walletAddress) !== ValidationResult.VALID
      ) {
        router.replace("/");
        return;
      }

      const isTzsafe = await isTzSafeContract(
        state.connection,
        router.query.walletAddress
      );

      if (isTzsafe) {
        const storage = await fetchContract(
          state.connection,
          router.query.walletAddress
        );

        dispatch({
          type: "setCurrentStorage",
          payload: storage,
        });

        dispatch({
          type: "setCurrentContract",
          payload: router.query.walletAddress,
        });
      } else router.replace("/");
    })();
  }, [router.query.walletAddress, state.currentContract, dispatch, router]);

  useEffect(() => {
    (async () => {
      if (state!.beaconWallet === null) {
        let a = init();
        dispatch({ type: "init", payload: a });
        const wallet = new BeaconWallet({
          name: "TzSafe",
          preferredNetwork: PREFERED_NETWORK,
        });
        dispatch!({ type: "beaconConnect", payload: wallet });

        const activeAccount = await wallet.client.getActiveAccount();
        if (activeAccount && state?.accountInfo == null) {
          const userAddress = await wallet.getPKH();
          const balance = await state?.connection.tz.getBalance(userAddress);
          dispatch!({
            type: "login",
            accountInfo: activeAccount!,
            address: userAddress,
            balance: balance!.toString(),
          });
        }
      }
    })();
  }, [state, dispatch]);

  useEffect(() => {
    setHasSidebar(false);
  }, [path]);

  const isSidebarHidden =
    Object.values(state.contracts).length === 0 &&
    (path === "/" ||
      path === "/new-wallet" ||
      path === "/import-wallet" ||
      path === "/address-book");

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        <div className="relative min-h-screen">
          <div id="modal" />
          <Banner>
            <span className="font-light">Make sure the URL is </span>
            {PREFERED_NETWORK === NetworkType.MAINNET
              ? "tzsafe.marigold.dev"
              : "ghostnet.tzsafe.marigold.dev"}
          </Banner>
          <NavBar />

          {isSidebarHidden ? null : (
            <Sidebar isOpen={hasSidebar} onClose={() => setHasSidebar(false)} />
          )}

          <div
            className={`pb-28 pt-20 ${isSidebarHidden ? "" : "md:pl-72"} ${
              state.hasBanner ? "mt-12" : ""
            }`}
          >
            <button
              className="ml-4 mt-4 flex items-center space-x-2 text-zinc-300 md:hidden"
              onClick={() => {
                setHasSidebar(true);
              }}
            >
              <span className="text-xs">Open sidebar</span>
              <ArrowRightIcon className="h-4 w-4" />
            </button>

            <Component {...pageProps} />
          </div>
          <Footer
            shouldRemovePadding={Object.entries(state.contracts).length === 0}
          />
        </div>
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}
