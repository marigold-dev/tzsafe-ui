import { useSearchParams, useRouter } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import Step from "../components/import/importStep";
import Meta from "../components/meta";
import Stepper from "../components/stepper";
import { PREFERED_NETWORK } from "../context/config";
import FormContext from "../context/formContext";
import { AppDispatchContext, AppStateContext } from "../context/state";

function Import() {
  let router = useRouter();
  let params = useSearchParams();
  const [formState, setFormState] = useState<any>({
    walletAddress: !!params.get("address") ? params.get("address") : "",
  });
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [formStatus, setFormStatus] = useState("");
  const state = useContext(AppStateContext);
  const dispatch = useContext(AppDispatchContext);

  useEffect(() => {}, [state, dispatch, router]);

  return (
    <div className="h-full grow">
      <Meta title={"Import wallet - TzSafe"} />
      <h1 className="mx-auto max-w-7xl py-6 px-4 text-2xl font-extrabold text-white sm:px-6 lg:px-8">
        Import wallet
      </h1>
      <main className="mt-8 grow">
        <div className="mx-auto max-w-7xl py-0 sm:px-6 lg:px-8">
          <div className="px-4 sm:px-0">
            <div className="md:min-h-96 grid min-h-fit grid-rows-2 p-2 md:grid-cols-2 md:grid-rows-1">
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

export default Import;
