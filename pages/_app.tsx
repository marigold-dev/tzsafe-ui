import {
  BeaconEvent,
  defaultEventCallbacks,
  LocalStorage,
  NetworkType,
  setDebugEnabled,
} from "@airgap/beacon-sdk";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import { BeaconWallet } from "@taquito/beacon-wallet";
import type { AppProps } from "next/app";
import { usePathname } from "next/navigation";
import { useRouter } from "next/router";
import { useReducer, useEffect, useState } from "react";
import Banner from "../components/Banner";
import PoeModal from "../components/PoeModal";
import Sidebar from "../components/Sidebar";
import Footer from "../components/footer";
import NavBar from "../components/navbar";
import P2PClient from "../context/P2PClient";
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
import Proposals from "./proposals";

export default function App({ Component, pageProps }: AppProps) {
  const [state, dispatch]: [tezosState, React.Dispatch<action>] = useReducer(
    reducer,
    emptyState()
  );

  const [hasSidebar, setHasSidebar] = useState(false);

  const path = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!path) return;

    if (
      ![
        "/settings",
        "/proposals",
        "/history",
        "/fund-wallet",
        "/new-proposal",
      ].includes(path)
    )
      return;

    if (Object.values(state.contracts).length > 0) return;

    router.replace("/");
  }, [path, state]);

  useEffect(() => {
    (async () => {
      let a = init();
      dispatch({ type: "init", payload: a });

      const p2pClient = new P2PClient({
        name: "TzSafe",
        storage: new LocalStorage("P2P"),
      });

      await p2pClient.init();
      await p2pClient.connect(p2pClient.handleMessages).catch(console.log);

      // Connect stored peers
      Object.values(state.connectedDapps)
        .flatMap(v => Object.values(v))
        .forEach(async data => {
          p2pClient.addPeer(data);
        });

      const wallet = new BeaconWallet({
        name: "TzSafe",
        preferredNetwork: PREFERED_NETWORK,
        storage: new LocalStorage("LOCAL"),
        disableDefaultEvents: false,
        eventHandlers: {
          [BeaconEvent.PAIR_INIT]: {
            handler: defaultEventCallbacks.PAIR_INIT,
          },
          [BeaconEvent.PAIR_SUCCESS]: {
            handler: defaultEventCallbacks.PAIR_SUCCESS,
          },
        },
      });
      setDebugEnabled(true);

      dispatch!({ type: "beaconConnect", payload: wallet });
      dispatch!({ type: "p2pConnect", payload: p2pClient });

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
    })();
  }, []);

  useEffect(() => {
    setHasSidebar(false);
  }, [path]);

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        <div className="relative min-h-screen">
          <div id="modal" />
          <PoeModal />
          <Banner>
            <span className="font-light">Make sure the URL is </span>
            {PREFERED_NETWORK === NetworkType.MAINNET
              ? "tzsafe.marigold.dev"
              : "ghostnet.tzsafe.marigold.dev"}
          </Banner>
          <NavBar />
          {Object.entries(state.contracts).length > 0 && (
            <Sidebar isOpen={hasSidebar} onClose={() => setHasSidebar(false)} />
          )}
          <div
            className={`pb-28 pt-20 ${
              Object.entries(state.contracts).length === 0 ? "" : "md:pl-72"
            } ${state.hasBanner ? "mt-12" : ""}`}
          >
            {Object.entries(state.contracts).length > 0 && (
              <button
                className="ml-4 mt-4 flex items-center space-x-2 text-zinc-300 md:hidden"
                onClick={() => {
                  setHasSidebar(true);
                }}
              >
                <span className="text-xs">Open sidebar</span>
                <ArrowRightIcon className="h-4 w-4" />
              </button>
            )}

            {path === "/" && !!state.currentContract ? (
              <Proposals />
            ) : (
              <Component {...pageProps} />
            )}
          </div>
          <Footer
            shouldRemovePadding={Object.entries(state.contracts).length === 0}
          />
        </div>
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}
