import { useRouter } from "next/router";
import { useContext, useEffect } from "react";
import Meta from "../components/meta";
import TransferForm from "../components/transferForm";
import { AppStateContext } from "../context/state";
import useIsOwner from "../utils/useIsOwner";

const CreateProposal = () => {
  const state = useContext(AppStateContext)!;

  const router = useRouter();
  const isOwner = useIsOwner();

  useEffect(() => {
    if (isOwner) return;

    router.replace("/proposals");
  }, [isOwner, router]);

  return (
    <div className="min-h-content relative flex grow flex-col">
      <Meta title={"New Proposal - TzSafe"} />
      <div>
        <div className="mx-auto flex max-w-7xl justify-start py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-extrabold text-white">New proposal</h1>
        </div>
      </div>
      <main className="h-full min-h-fit grow">
        <div className="mx-auto h-full min-h-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {!state.currentContract ? (
            <h2 className="text-center text-xl text-zinc-600">
              Please select a wallet in the sidebar
            </h2>
          ) : (
            <TransferForm
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

export default CreateProposal;
