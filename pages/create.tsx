import { NetworkType } from "@airgap/beacon-sdk";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import Step from "../components/create/createStep";
import Footer from "../components/footer";
import Meta from "../components/meta";
import NavBar from "../components/navbar";
import Stepper from "../components/stepper";
import FormContext from "../context/formContext";
import { AppDispatchContext, AppStateContext } from "../context/state";
function Home() {

    const [formState, setFormState] = useState<any>(null)
    const [activeStepIndex, setActiveStepIndex] = useState(0)
    const [formStatus, setFormStatus] = useState("")
    const state = useContext(AppStateContext);
    const dispatch = useContext(AppDispatchContext);
    let router = useRouter()

    useEffect(() => {
        const connectWallet = async (): Promise<void> => {
            try {
                await state?.beaconWallet!.requestPermissions({
                    network: {
                        type: NetworkType.GHOSTNET,
                    }
                });
                const userAddress: string = await state?.beaconWallet!.getPKH()!;
                const balance = await state?.connection.tz.getBalance(userAddress);
                let s = await state?.beaconWallet!.client.getActiveAccount();
                dispatch!({ type: "login", accountInfo: s!, address: userAddress, balance: balance!.toString() })
            } catch (error) {
                router.replace("/")
            }
        };
        (async () => {
            if (!state?.address && state?.beaconWallet) {
                await connectWallet()
            }
        })()
    }, [router, dispatch, state])
    return (
        <div className="relative h-full min-h-screen flex flex-col overflow-y-auto">
            <Meta title={"Create wallet"} />

            <NavBar />
            <div className="bg-graybg shadow">
                <div className="mx-auto  max-w-7xl py-6 px-4 sm:px-6 lg:px-8 flex justify-start">
                    <h1 className="text-white text-2xl font-extrabold">
                        Create multisig wallet (version 0.0.6)
                    </h1>
                </div>
            </div>
            <main className=" bg-gray-100 grow">
                <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
                    <div className="px-4 py-6 sm:px-0">
                        <div className="md:min-h-96 min-h-fit border-4 border-dashed border-white grid-rows-2 md:grid-cols-2 md:grid-rows-1 grid p-2">
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
            <Footer />
        </div>
    );
}

export default Home;
