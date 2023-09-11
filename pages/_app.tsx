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
import Spinner from "../components/Spinner";
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
  contractStorage,
} from "../context/state";
import "../styles/globals.css";
import { fetchContract } from "../utils/fetchContract";

export default function App({ Component, pageProps }: AppProps) {
  const [state, dispatch]: [tezosState, React.Dispatch<action>] = useReducer(
    reducer,
    emptyState()
  );

  const [isFetching, setIsFetching] = useState(true);
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

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentContract, path]);

  useEffect(() => {
    (async () => {
      if (
        router.pathname.includes("[walletAddress]") &&
        !router.query.walletAddress
      )
        return;

      if (
        !router.query.walletAddress ||
        Array.isArray(router.query.walletAddress) ||
        (router.query.walletAddress === state.currentContract &&
          !!state.currentStorage)
      ) {
        setIsFetching(false);
        return;
      }

      if (!!state.contracts[router.query.walletAddress]) {
        dispatch({
          type: "setCurrentContract",
          payload: router.query.walletAddress,
        });
        setIsFetching(false);
        return;
      }

      if (
        validateAddress(router.query.walletAddress) !== ValidationResult.VALID
      ) {
        setIsFetching(false);
        router.replace(
          `/invalid-contract?address=${router.query.walletAddress}`
        );
        return;
      }

      if (state.currentStorage?.address === router.query.walletAddress) {
        setIsFetching(false);
        return;
      }

      try {
        const storage = await fetchContract(
          state.connection,
          router.query.walletAddress
        );

        if (!storage) {
          setIsFetching(false);
          router.replace(
            `/invalid-contract?address=${router.query.walletAddress}`
          );
          return;
        }

        storage.address = router.query.walletAddress;

        dispatch({
          type: "setCurrentStorage",
          payload: storage as contractStorage & { address: string },
        });

        dispatch({
          type: "setCurrentContract",
          payload: router.query.walletAddress,
        });
        setIsFetching(false);
      } catch (e) {
        setIsFetching(false);
        router.replace(
          `/invalid-contract?address=${router.query.walletAddress}`
        );
      }
    })();
  }, [
    router.query.walletAddress,
    state.currentContract,
    dispatch,
    router,
    state.currentStorage,
    state.connection,
  ]);

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
            <Sidebar
              isOpen={hasSidebar}
              onClose={() => setHasSidebar(false)}
              isLoading={isFetching}
            />
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

            {!isFetching ? (
              <Component {...pageProps} />
            ) : (
              <div className="mt-12 flex w-full items-center justify-center">
                <Spinner />
              </div>
            )}
          </div>
          <Footer shouldRemovePadding={isSidebarHidden} />
        </div>
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}
