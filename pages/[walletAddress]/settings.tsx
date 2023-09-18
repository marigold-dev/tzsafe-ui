import { getSenderId } from "@airgap/beacon-sdk";
import { Cross1Icon } from "@radix-ui/react-icons";
import { useRouter } from "next/router";
import { useContext, useEffect, useMemo, useState } from "react";
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

  const connectedDapps = useMemo(
    () =>
      Object.values(state.connectedDapps[state.currentContract ?? ""] ?? {}),
    [state.currentContract, state.connectedDapps]
  );

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
              if (!state.currentContract) return;

              setIsDeleting(true);
              setCanDelete(false);
              dispatch!({
                type: "removeContract",
                address: state.currentContract,
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
          {!state.currentContract ? (
            <h2 className="text-center text-xl text-zinc-600">
              Please select a wallet in the sidebar
            </h2>
          ) : (
            <>
              <section className="mb-4 text-white">
                <h2 className="text-lg ">Connected Dapps</h2>

                <ul className="mt-2 w-full space-y-2">
                  {connectedDapps.length === 0 ? (
                    <p className="text-zinc-500">There is no connected Dapps</p>
                  ) : (
                    connectedDapps.map(data => {
                      return (
                        <li
                          key={data.id}
                          className="flex w-full items-center space-x-6"
                        >
                          <button
                            className="rounded bg-primary p-1 text-sm text-white hover:bg-red-500 hover:outline-none focus:bg-red-500"
                            title="Disconnect"
                            onClick={async () => {
                              const senderId = await getSenderId(
                                data.publicKey
                              );

                              await state.p2pClient?.removePeer({
                                ...data,
                                type: "p2p-pairing-response",
                                senderId,
                              });
                              await state.p2pClient?.removeAppMetadata(
                                senderId
                              );

                              dispatch({
                                type: "removeDapp",
                                payload: data.id,
                              });
                            }}
                          >
                            <Cross1Icon />
                          </button>
                          <a
                            href={data.appUrl}
                            title={data.name}
                            target="_blank"
                            rel="noreferrer"
                            className="text-md hover:text-zinc-200"
                          >
                            {data.name}
                          </a>
                        </li>
                      );
                    })
                  )}
                </ul>
              </section>
              <SignersForm
                disabled={!isOwner}
                address={state.currentContract}
                contract={
                  state.contracts[state.currentContract] ?? state.currentStorage
                }
                closeModal={console.log}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Settings;
