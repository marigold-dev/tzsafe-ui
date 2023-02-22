import { NetworkType } from "@airgap/beacon-sdk";
import { useSearchParams, useRouter } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import Footer from "../components/footer";
import Step from "../components/import/importStep";
import Meta from "../components/meta";
import NavBar from "../components/navbar";
import Stepper from "../components/stepper";
import FormContext from "../context/formContext";
import { AppDispatchContext, AppStateContext } from "../context/state";

function Home() {
  let router = useRouter();
  let params = useSearchParams();
  const [formState, setFormState] = useState<any>({
    walletAddress: !!params.get("address") ? params.get("address") : "",
  });
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [formStatus, setFormStatus] = useState("");
  const state = useContext(AppStateContext);
  const dispatch = useContext(AppDispatchContext);

  useEffect(() => {
    const connectWallet = async (): Promise<void> => {
      try {
        await state?.beaconWallet!.requestPermissions({
          network: {
            type: NetworkType.GHOSTNET,
          },
        });
        const userAddress: string = await state?.beaconWallet!.getPKH()!;
        const balance = await state?.connection.tz.getBalance(userAddress);
        let s = await state?.beaconWallet!.client.getActiveAccount();
        dispatch!({
          type: "login",
          accountInfo: s!,
          address: userAddress,
          balance: balance!.toString(),
        });
      } catch (error) {
        router.replace("/");
      }
    };
    (async () => {
      if (!state?.address && state?.beaconWallet) {
        await connectWallet();
      }
    })();
  }, [state, dispatch, router]);

  return (
    <div className="min-h-content relative flex grow flex-col">
      <Meta title={"Import wallet"} />
      <div className="bg-graybg shadow">
        <div className="mx-auto  flex max-w-7xl justify-start py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-extrabold text-white">
            Import multisig wallet
          </h1>
        </div>
      </div>
      <main className="grow">
        <div className="mx-auto max-w-7xl py-6 px-4 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="md:min-h-96 grid min-h-fit grid-rows-2  p-2 md:grid-cols-2 md:grid-rows-1">
              <div className="col-span-2 row-span-2 flex flex-col items-center justify-items-center">
                <FormContext.Provider
                  value={{
                    activeStepIndex: activeStepIndex,
                    setActiveStepIndex,
                    setFormState,
                    formState,
                    formStatus,
                    setFormStatus,
                  }}
                >
                  <Stepper />
                  <Step />
                </FormContext.Provider>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Home;
