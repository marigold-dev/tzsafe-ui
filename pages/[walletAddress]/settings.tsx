import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Meta from "../../components/meta";
import SignersForm from "../../components/signersForm";
import { useAppDispatch, useAppState } from "../../context/state";
import { ParsedUrlQueryContract } from "../../types/app";
import useIsOwner from "../../utils/useIsOwner";

const Settings = () => {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const isOwner = useIsOwner();
  const { walletAddress: currentContract } =
    router.query as ParsedUrlQueryContract;

  const [canDelete, setCanDelete] = useState(
    !!state.contracts[currentContract]
  );
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setCanDelete(!!state.contracts[currentContract]);
  }, [currentContract, state.contracts]);

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
              canDelete && !isDeleting ? "" : "pointer-events-none opacity-50"
            } self-end rounded bg-primary p-2 text-white hover:bg-red-500`}
            onClick={() => {
              setIsDeleting(true);
              setCanDelete(false);
              dispatch!({
                type: "removeContract",
                address: currentContract,
              });

              const addresses = Object.keys(state.contracts);
              if (addresses.length === 0) {
                router.replace(`/`);
              } else {
                router.replace(`/${addresses[0]}/settings`);
              }
            }}
          >
            {isDeleting ? `Deleting wallet` : `Delete wallet`}
          </button>
        </div>
      </div>
      <main className="min-h-fit grow">
        <div className="mx-auto min-h-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {!currentContract ? (
            <h2 className="text-center text-xl text-zinc-600">
              Please select a wallet in the sidebar
            </h2>
          ) : (
            <SignersForm
              disabled={!isOwner}
              address={currentContract}
              contract={
                state.contracts[currentContract] ?? state.currentStorage
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
