'use client';

import {
    BeaconEvent,
    defaultEventCallbacks,
    NetworkType,
} from "@airgap/beacon-sdk";
import { BeaconWallet } from "@taquito/beacon-wallet";
import Link from "next/link";
import React, { useEffect, useReducer, useRef } from "react";
import NavBar from "../components/navbar";
import { action, AppDispatchContext, AppStateContext, emptyState, init, reducer, tezosState } from "../context/state";

function Home() {
    let [state, dispatch]: [tezosState, React.Dispatch<action>] = useReducer(reducer, emptyState);
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
    return (
        <AppStateContext.Provider value={state}>
            <AppDispatchContext.Provider value={dispatch}>
                <NavBar>{/* <LinkComponent text="Dash" path={"/dash"} /> */}</NavBar>

                <div className="bg-white shadow">
                    <div className="mx-auto  max-w-7xl py-6 px-4 sm:px-6 lg:px-8 flex justify-start">
                        <h1 className="text-black text-3xl font-extrabold">
                            Imported wallets
                        </h1>
                    </div>
                </div>
                <main className="min-h-full bg-gray-100">
                    <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
                        <div className="px-4 py-6 sm:px-0">
                            <div className="md:h-96 min-h-fit rounded-lg border-4 border-dashed border-gray-200 grid-rows-auto md:grid-cols-auto md:grid-rows-auto grid p-2">
                                {state?.contracts && Object.entries(state!.contracts).map(([address, contract]) => {
                                    return (
                                        <Link
                                            key={address}
                                            className="rounded-md bg-indigo-500 font-medium text-white my-2 p-2 hover:bg-indigo-600 focus:bg-indigo-600 hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                                            href={`/contracts/${address}`}
                                        >
                                            {state.aliases[address] ? <div>
                                                <p className="text-xs md:text-xl">
                                                    {state.aliases[address]}
                                                </p>
                                                <p className="text-xs md:text-xl">
                                                    {address}
                                                </p>
                                            </div>
                                                : <p className="text-xs md:text-xl">
                                                    {address}
                                                </p>}
                                        </Link>)
                                })}
                            </div>
                        </div>
                    </div>
                </main>
            </AppDispatchContext.Provider>
        </AppStateContext.Provider>
    );
}



export default Home;
