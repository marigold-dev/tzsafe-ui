import { useRouter } from "next/router";
import { useContext, useEffect, useState } from "react";
import Meta from "../../components/meta";
import SignersForm from "../../components/signersForm";
import { AppDispatchContext, AppStateContext } from "../../context/state";
import useIsOwner from "../../utils/useIsOwner";

const Settings = () => {
  const state = useContext(AppStateContext)!;
  const dispatch = useContext(AppDispatchContext)!;
  const router = useRouter();
  const isOwner = useIsOwner();

  const [canDelete, setCanDelete] = useState(
    !!state.currentContract && !!state.contracts[state.currentContract]
  );
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!state.currentContract) return;

      setCanDelete(
        !!state.currentContract && !!state.contracts[state.currentContract]
      );
    })();
  }, [state.currentContract, state.contracts]);

  useEffect(() => {
    if (!isDeleting) return;

    const timeoutId = setTimeout(() => {
      setIsDeleting(false);
      setCanDelete(true);
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [isDeleting]);

  return (
    <div className="min-h-content relative flex grow flex-col">
      <Meta title={"Settings - TzSafe"} />
      <div>
        <div className="mx-auto flex max-w-7xl flex-col justify-start px-4 py-6 sm:px-6 md:flex-row md:justify-between lg:px-8">
          <h1 className="text-2xl font-extrabold text-white">Settings</h1>

          <button
            className={`${
              !isDeleting || !canDelete ? "" : "pointer-events-none opacity-50"
            } self-end rounded bg-primary p-2 text-white hover:bg-red-500`}
            onClick={() => {
              if (!state.currentContract) return;

              setIsDeleting(true);
              setCanDelete(false);
              dispatch!({
                type: "removeContract",
                address: state.currentContract,
              });

              const addresses = Object.keys(state.contracts);
              if (addresses.length === 0) return;
              router.replace(`/${addresses[0]}/settings`);
            }}
          >
            {isDeleting ? `Deleting wallet` : `Delete wallet`}
          </button>
        </div>
      </div>
      <main className="min-h-fit grow">
        <div className="mx-auto min-h-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {!state.currentContract ? (
            <h2 className="text-center text-xl text-zinc-600">
              Please select a wallet in the sidebar
            </h2>
          ) : (
            <SignersForm
              disabled={!isOwner}
              address={state.currentContract}
              contract={
                state.contracts[state.currentContract] ?? state.currentStorage
              }
              closeModal={console.log}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default Settings;
