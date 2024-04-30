import { useRouter } from "next/router";
import { useEffect } from "react";
import Meta from "../../components/meta";
import TransferForm from "../../components/transferForm";
import { useContracts } from "../../context/contracts";
import { useAppState } from "../../context/state";
import useCurrentContract from "../../hooks/useCurrentContract";
import useIsOwner from "../../utils/useIsOwner";

const CreateProposal = () => {
  const state = useAppState();

  const router = useRouter();
  const isOwner = useIsOwner();

  const { contracts } = useContracts();
  const currentContract = useCurrentContract();

  useEffect(() => {
    if (!isOwner) router.replace(`/${currentContract}/proposals`);
  }, [isOwner, router, currentContract]);

  return (
    <div className="min-h-content relative flex grow flex-col">
      <Meta title={"New Proposal - TzSafe"} />
      <div>
        <div className="mx-auto flex max-w-7xl justify-start px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-extrabold text-white">New proposal</h1>
        </div>
      </div>
      <main className="min-h-fit grow">
        <div className="mx-auto min-h-full max-w-7xl px-4 py-2 sm:px-6 lg:px-8 lg:py-6">
          {!currentContract ? (
            <h2 className="text-center text-xl text-zinc-600">
              Please select a wallet in the sidebar
            </h2>
          ) : (
            <TransferForm
              address={currentContract}
              contract={contracts[currentContract] ?? state.currentStorage}
              closeModal={console.log}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default CreateProposal;
