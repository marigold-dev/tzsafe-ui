import { useEffect, useMemo, useState } from "react";
import { Event } from "../context/P2PClient";
import { useAliases } from "../context/aliases";
import { useDapps, useP2PClient } from "../context/dapps";
import { useAppState } from "../context/state";
import { useWallet } from "../context/wallet";
import { decodeData } from "../pages/[walletAddress]/beacon";
import { P2pData } from "../types/app";
import { signers } from "../versioned/apis";
import { hasTzip27Support } from "../versioned/util";
import Select from "./Select";
import Spinner from "./Spinner";

enum State {
  INITIAL,
  LOADING,
  AUTHORIZED,
  REFUSED,
  LOGIN,
  ERROR,
}

const LoginModal = ({ data, onEnd }: { data: string; onEnd: () => void }) => {
  const state = useAppState();
  const p2pClient = useP2PClient();
  const { addDapp } = useDapps();

  const [parsedData, setParsedData] = useState<undefined | P2pData>();
  const [error, setError] = useState<undefined | string>();

  const { userAddress, wallet, connectWallet } = useWallet();
  const { addressBook } = useAliases();

  const options = useMemo(() => {
    if (!userAddress) return [];

    return Object.keys(state.contracts).flatMap(address => {
      if (!hasTzip27Support(state.contracts[address].version)) return [];

      if (!signers(state.contracts[address]).includes(userAddress!)) return [];

      return [
        {
          id: address,
          value: address,
          label: addressBook[address],
        },
      ];
    });
  }, [state.contracts, userAddress]);

  const [selectedWallet, setSelectedWallet] = useState<
    { id: string; value: string; label: string } | undefined
  >(() => options[0]);

  const [currentState, setCurrentState] = useState(() => State.LOADING);

  useEffect(() => {
    try {
      const decoded = decodeData(data);

      setParsedData(decoded);

      p2pClient.on(Event.PERMISSION_REQUEST, () => {
        if (!userAddress) {
          setCurrentState(State.LOGIN);
        } else if (
          decoded.name.toLowerCase().includes("tzsafe") ||
          decoded.appUrl.toLowerCase().includes("tzsafe")
        ) {
          setError("TzSafe can't pair with itself for now");
          setCurrentState(State.ERROR);
        } else {
          setCurrentState(State.INITIAL);
        }
      });

      p2pClient.addPeer(decoded);
    } catch (e) {
      setError((e as Error).message);
      setCurrentState(State.ERROR);
    }
  }, [data, p2pClient]);

  useEffect(() => {
    if (currentState === State.LOGIN && !!userAddress) {
      setCurrentState(State.INITIAL);
    }
  }, [userAddress]);

  return (
    <div className="fixed bottom-0 left-0 right-0 top-0 z-50 flex items-center justify-center bg-black/30">
      <div
        className={`max-h-[90%] min-h-[96] w-[90%] overflow-auto rounded bg-graybg px-3 py-6 text-white lg:w-1/3 lg:px-6 lg:py-12`}
      >
        {(() => {
          switch (currentState) {
            case State.LOADING:
              return (
                <div className="flex  flex-col items-center justify-center space-y-4">
                  <p>Waiting for Beacon connection</p>
                  <Spinner />
                </div>
              );

            case State.INITIAL:
              if (options.length === 0) {
                return (
                  <>
                    <h1 className="text-center text-lg font-medium">
                      No Available Wallet for Dapp Connection
                    </h1>
                    <p className="mt-2 text-center text-sm text-zinc-400">
                      Ensure you have a wallet version of 0.3.3 or higher. If
                      not, please create and import a new one to access all
                      available features. Once this is done, proceed to connect
                      with the Dapp again.
                    </p>
                    <div className="mt-4 flex justify-center">
                      <button
                        className="rounded bg-primary px-4 py-2 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500"
                        onClick={() => {
                          p2pClient?.refusePermission();
                          onEnd();
                        }}
                      >
                        Close
                      </button>
                    </div>
                  </>
                );
              }

              return (
                <>
                  <div className="w-full">
                    <Select
                      label="Wallet to connect"
                      value={selectedWallet}
                      options={options}
                      onChange={setSelectedWallet}
                      onSearch={() => {}}
                      withSearch={false}
                      renderOption={({ value, label }) => {
                        return (
                          <div className="flex flex-col items-start overflow-hidden">
                            <span>{label}</span>
                            <span className="text-zinc-400">{value}</span>
                          </div>
                        );
                      }}
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-center space-x-4">
                    <button
                      type="button"
                      className="rounded border-2 bg-transparent px-3 py-1 font-medium text-white hover:outline-none"
                      onClick={async e => {
                        e.preventDefault();

                        if (!p2pClient.hasReceivedPermissionRequest()) return;

                        await p2pClient.refusePermission();
                        setCurrentState(State.REFUSED);
                      }}
                    >
                      Refuse
                    </button>
                    <button
                      type="button"
                      className={
                        "rounded border-2 border-primary bg-primary px-3 py-1 font-medium text-white hover:border-red-500 hover:bg-red-500 hover:outline-none focus:border-red-500 focus:bg-red-500"
                      }
                      onClick={async e => {
                        e.preventDefault();

                        if (
                          !parsedData ||
                          !p2pClient.hasReceivedPermissionRequest() ||
                          !selectedWallet
                        )
                          return;

                        setCurrentState(State.LOADING);
                        await p2pClient.approvePermission(selectedWallet.value);
                        setCurrentState(State.AUTHORIZED);
                        addDapp(selectedWallet.value, parsedData);
                      }}
                    >
                      Authorize
                    </button>
                  </div>
                </>
              );

            case State.REFUSED:
              return (
                <>
                  <h1 className="text-center text-lg font-medium">
                    You have refused the connection to{" "}
                    {parsedData?.name ?? "Dapp"}{" "}
                  </h1>
                  <div className="mt-4 flex justify-center">
                    <button
                      className="rounded bg-primary px-4 py-2 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500"
                      onClick={onEnd}
                    >
                      Close
                    </button>
                  </div>
                </>
              );
            case State.AUTHORIZED:
              return (
                <>
                  <h1 className="text-center text-lg font-medium">
                    Successfully connected to {parsedData?.name ?? "Dapp"}
                  </h1>
                  <div className="mt-4 flex justify-center">
                    <button
                      className="rounded bg-primary px-4 py-2 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500"
                      onClick={onEnd}
                    >
                      Close
                    </button>
                  </div>
                </>
              );

            case State.LOGIN:
              return (
                <>
                  <h1 className="text-center text-lg font-medium">
                    Owner Login Not Detected
                  </h1>
                  <p className="mt-2 text-center text-sm text-zinc-400">
                    To establish a connection with a DApp using TzSafe, select a
                    wallet other than TzSafe itself to log in TzSafe.
                  </p>
                  <div className="mt-4 flex w-full items-center justify-center space-x-4">
                    <button
                      className="rounded border bg-transparent px-4 py-2 font-medium text-white "
                      onClick={() => {
                        p2pClient?.refusePermission();
                        onEnd();
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={connectWallet}
                      type="button"
                      className={`rounded bg-primary px-4 py-2 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500 ${
                        !wallet ? "pointer-events-none opacity-50" : ""
                      }`}
                    >
                      Connect{" "}
                    </button>
                  </div>
                </>
              );
            case State.ERROR:
              return (
                <>
                  <h1 className="text-lg font-medium">An error occured</h1>
                  <p>{error}</p>
                  <div className="mt-4">
                    <button
                      className="rounded bg-primary px-4 py-2 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500"
                      onClick={async () => {
                        await p2pClient?.refusePermission();
                        onEnd();
                      }}
                    >
                      Close
                    </button>
                  </div>
                </>
              );
          }
        })()}
      </div>
    </div>
  );
};

export default LoginModal;
