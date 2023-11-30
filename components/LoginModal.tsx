import { useContext, useEffect, useMemo, useState } from "react";
import { Event } from "../context/P2PClient";
import { AppDispatchContext, AppStateContext } from "../context/state";
import { decodeData } from "../pages/[walletAddress]/beacon";
import { connectWallet } from "../utils/connectWallet";
import { p2pData } from "../versioned/interface";
import { hasTzip27Support } from "../versioned/util";
import Select from "./Select";
import Spinner from "./Spinner";
import LoginButton from "./loginButton";

enum State {
  INITIAL,
  LOADING,
  AUTHORIZED,
  REFUSED,
  LOGIN,
  ERROR,
}

const LoginModal = ({ data, onEnd }: { data: string; onEnd: () => void }) => {
  const state = useContext(AppStateContext)!;
  const dispatch = useContext(AppDispatchContext)!;

  const [parsedData, setParsedData] = useState<undefined | p2pData>();
  const [error, setError] = useState<undefined | string>();

  const options = useMemo(() => {
    if (!state.address) return [];

    return Object.keys(state.contracts).flatMap(address => {
      if (!hasTzip27Support(state.contracts[address].version)) return [];

      return [
        {
          id: address,
          value: address,
          label: state.aliases[address],
        },
      ];
    });
  }, [state.contracts, state.address]);

  const [selectedWallet, setSelectedWallet] = useState<
    { id: string; value: string; label: string } | undefined
  >(() => options[0]);

  const [currentState, setCurrentState] = useState(() => State.LOADING);

  useEffect(() => {
    if (!state.p2pClient || !state.attemptedInitialLogin) return;

    try {
      const decoded = decodeData(data);

      setParsedData(decoded);

      state.p2pClient!.on(Event.PERMISSION_REQUEST, () => {
        if (state.attemptedInitialLogin && !state.address) {
          setCurrentState(State.LOGIN);
          return;
        }

        setCurrentState(State.INITIAL);
      });

      state.p2pClient!.addPeer(decoded);
    } catch (e) {
      setError((e as Error).message);
      setCurrentState(State.ERROR);
    }
  }, [data, state.p2pClient, state.attemptedInitialLogin]);

  useEffect(() => {
    if (currentState === State.LOGIN && !!state.address) {
      setCurrentState(State.INITIAL);
    }
  }, [state.address]);

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
                      You don{"'"}t have any wallet that is compatible with
                      Tzip27
                    </h1>
                    <p className="mt-2 text-center text-sm text-zinc-400">
                      Please create or import a wallet before trying to connect
                      with Beacon
                    </p>
                    <div className="mt-4 flex justify-center">
                      <button
                        className="rounded bg-primary px-4 py-2 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500"
                        onClick={() => {
                          state.p2pClient?.refusePermission();
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

                        if (!state.p2pClient!.hasReceivedPermissionRequest())
                          return;

                        await state.p2pClient!.refusePermission();
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
                          !state.p2pClient!.hasReceivedPermissionRequest() ||
                          !selectedWallet
                        )
                          return;

                        setCurrentState(State.LOADING);
                        await state.p2pClient!.approvePermission(
                          selectedWallet.value
                        );
                        setCurrentState(State.AUTHORIZED);
                        dispatch({
                          type: "addDapp",
                          payload: {
                            data: parsedData,
                            address: selectedWallet.value,
                          },
                        });
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
                    Successfuly connected to {parsedData?.name ?? "Dapp"}
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
                    Login to your wallet
                  </h1>
                  <div className="mt-4 flex w-full items-center justify-center space-x-4">
                    <button
                      className="rounded border bg-transparent px-4 py-2 font-medium text-white "
                      onClick={() => {
                        state.p2pClient?.refusePermission();
                        onEnd();
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        await connectWallet(state, dispatch);
                      }}
                      type="button"
                      className={`rounded bg-primary px-4 py-2 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500 ${
                        !state.beaconWallet
                          ? "pointer-events-none opacity-50"
                          : ""
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
                      onClick={onEnd}
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
