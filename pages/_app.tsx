import {
  NetworkType,
  BeaconEvent,
  defaultEventCallbacks,
} from "@airgap/beacon-sdk";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import { BeaconWallet } from "@taquito/beacon-wallet";
import type { AppProps } from "next/app";
import { usePathname } from "next/navigation";
import { useRouter } from "next/router";
import { useReducer, useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Footer from "../components/footer";
import NavBar from "../components/navbar";
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
  let [state, dispatch]: [tezosState, React.Dispatch<action>] = useReducer(
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
        "/top-up",
        "/create-proposal",
      ].includes(path)
    )
      return;

    if (!state.address) {
      router.replace("/");
    }

    if (Object.values(state.contracts).length > 0) return;

    router.replace("/");
  }, [path, state]);

  useEffect(() => {
    (async () => {
      if (state!.beaconWallet === null) {
        let a = init();
        dispatch({ type: "init", payload: a });
        const wallet = new BeaconWallet({
          name: "Multisig wallet",
          preferredNetwork: NetworkType.GHOSTNET,
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

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        <div className="relative min-h-screen">
          <div id="modal" />
          <NavBar />
          {!!state.address && Object.entries(state.contracts).length > 0 && (
            <Sidebar isOpen={hasSidebar} onClose={() => setHasSidebar(false)} />
          )}
          <div
            className={`pt-20 pb-28 ${
              !state.address || Object.entries(state.contracts).length === 0
                ? ""
                : "md:pl-72"
            }`}
          >
            <button
              className="ml-4 mt-4 flex items-center space-x-2 text-zinc-500 md:hidden"
              onClick={() => {
                setHasSidebar(true);
              }}
            >
              <span className="text-xs">Open sidebar</span>
              <ArrowRightIcon className="h-4 w-4" />
            </button>
            {path === "/" && !!state.address && !!state.currentContract ? (
              <Proposals />
            ) : (
              <Component {...pageProps} />
            )}
          </div>
          <Footer
            shouldRemovePadding={
              !state.address || Object.entries(state.contracts).length === 0
            }
          />
        </div>
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}
