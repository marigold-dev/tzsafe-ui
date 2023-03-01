import { useContext, useEffect, useState } from "react";
import Meta from "../components/meta";
import SignersForm from "../components/signersForm";
import { AppDispatchContext, AppStateContext } from "../context/state";

const Settings = () => {
  const state = useContext(AppStateContext)!;
  const dispatch = useContext(AppDispatchContext)!;
  const [canDelete, setCanDelete] = useState(true);

  useEffect(() => {
    if (canDelete) return;

    const timeoutId = setTimeout(() => {
      setCanDelete(true);
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [canDelete]);

  return (
    <div className="min-h-content relative flex grow flex-col">
      <Meta title={"Create Proposal"} />
      <div>
        <div className="mx-auto flex max-w-7xl flex-col justify-start py-6 px-4 sm:px-6 md:flex-row md:justify-between lg:px-8">
          <h1 className="text-2xl font-extrabold text-white">Settings</h1>

          <button
            className={`${
              canDelete ? "" : "pointer-events-none opacity-50"
            } self-end rounded bg-primary p-2 text-white hover:bg-red-500`}
            onClick={() => {
              if (!state.currentContract) return;

              setCanDelete(false);
              dispatch!({
                type: "removeContract",
                address: state.currentContract,
              });
            }}
          >
            Delete wallet
          </button>
        </div>
      </div>
      <main className="h-full min-h-fit grow">
        <div className="mx-auto h-full min-h-full max-w-7xl py-6 px-4 sm:px-6 lg:px-8">
          {!state.currentContract ? (
            <h2 className="text-center text-xl text-zinc-600">
              Please select a wallet in the sidebar
            </h2>
          ) : (
            <SignersForm
              address={state.currentContract}
              contract={state.contracts[state.currentContract]}
              closeModal={console.log}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default Settings;
