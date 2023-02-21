import {
  NetworkType,
  BeaconEvent,
  defaultEventCallbacks,
} from "@airgap/beacon-sdk";
import { BeaconWallet } from "@taquito/beacon-wallet";
import type { AppProps } from "next/app";
import { useReducer, useEffect } from "react";
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

export default function App({ Component, pageProps }: AppProps) {
  let [state, dispatch]: [tezosState, React.Dispatch<action>] = useReducer(
    reducer,
    emptyState()
  );
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
          <Sidebar />
          <div className="pt-20 pb-28 pl-72">
            <Component {...pageProps} />
          </div>
          <Footer />
        </div>
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}
