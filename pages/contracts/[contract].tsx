'use client';

import {
    BeaconEvent,
    defaultEventCallbacks,
    NetworkType,
} from "@airgap/beacon-sdk";
import { BeaconWallet } from "@taquito/beacon-wallet";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useReducer } from "react";
import NavBar from "../../components/navbar";
import { action, AppDispatchContext, AppStateContext, emptyState, init, reducer, tezosState } from "../../context/state";

function Home() {
    let [state, dispatch]: [tezosState, React.Dispatch<action>] = useReducer(reducer, emptyState);
    let router = usePathname()?.split("/")![2]!
    useEffect(() => {
        (async () => {
            if (state!.beaconWallet === null) {
                let a = init();
                dispatch({ type: "init", payload: a });
                const wallet = new BeaconWallet({
                    name: "Taquito React template",
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
    let contract = state.contracts[router]
    let alias = state.aliases[router]

    return (
        <AppStateContext.Provider value={state}>
            <AppDispatchContext.Provider value={dispatch}>
                <NavBar />

                <div className="bg-white shadow">
                    <div className="mx-auto  max-w-7xl py-6 px-4 sm:px-6 lg:px-8 flex flex-col justify-start">
                        {alias ? <div>
                            <h1 className="text-black text-xl md:text-3xl font-bold">
                                {alias}
                            </h1>
                            <div className="flex flex-row">
                                <p className="text-black text-l md:text-xl font-bold">
                                    {router}
                                </p>
                                <button className="ml-2 rounded-md md:bg-indigo-600 p-1 text-gray-200 hover:text-white focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800" onClick={() => { navigator.clipboard.writeText(router) }}>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="fill-indigo-500 w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5 3-3.75" />
                                    </svg>
                                </button>
                            </div>
                        </div> : <h1 className="text-black text-l md:text-3xl font-bold">
                            {router}
                        </h1>}
                    </div>
                </div>
                <main className="min-h-full bg-gray-100">
                    <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
                        <div className="px-4 py-6 sm:px-0">
                            <div className="md:h-96 min-h-fit rounded-lg border-4 border-dashed border-gray-200 grid-rows-2 md:grid-cols-2 md:grid-rows-1 grid p-2">
                                lol
                            </div>
                        </div>
                    </div>
                </main>
            </AppDispatchContext.Provider>
        </AppStateContext.Provider>
    );
}



export default Home;
