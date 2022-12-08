import {
    BeaconEvent,
    defaultEventCallbacks,
    NetworkType,
} from "@airgap/beacon-sdk";

import { BeaconWallet } from "@taquito/beacon-wallet";
import React, { useEffect, useReducer, useRef, useState } from "react";
import NavBar from "../components/navbar";
import { action, AppDispatchContext, AppStateContext, emptyState, init, reducer, tezosState } from "../context/state";
import FormContext from "../context/formContext";
import Stepper from "../components/stepper";
import Step from "../components/createStep";
function Home(props: { contracts: any }) {
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
    const [formState, setFormState] = useState<any>(null)
    const [activeStepIndex, setActiveStepIndex] = useState(0)
    const [formStatus, setFormStatus] = useState("")
    return (
        <AppStateContext.Provider value={state}>
            <AppDispatchContext.Provider value={dispatch}>
                <NavBar>{/* <LinkComponent text="Dash" path={"/dash"} /> */}</NavBar>
                <div className="bg-white shadow">
                    <div className="mx-auto  max-w-7xl py-6 px-4 sm:px-6 lg:px-8 flex justify-start">
                        <h1 className="text-black text-3xl font-extrabold">
                            Create multisig wallet
                        </h1>
                    </div>
                </div>
                <main className=" bg-gray-100">
                    <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
                        <div className="px-4 py-6 sm:px-0">
                            <div className="md:min-h-96 min-h-fit rounded-lg border-4 border-dashed border-gray-200 grid-rows-2 md:grid-cols-2 md:grid-rows-1 grid p-2">
                                <div className="col-span-2 row-span-2 justify-items-center items-center flex flex-col">
                                    <FormContext.Provider value={{ activeStepIndex: activeStepIndex, setActiveStepIndex, setFormState, formState, formStatus, setFormStatus }}>
                                        <Stepper />
                                        <Step />
                                    </FormContext.Provider>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </AppDispatchContext.Provider>
        </AppStateContext.Provider>
    );
}

export default Home;
