import bs58check from "bs58check";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/router";
import { useContext, useEffect, useState } from "react";
import Alias from "../components/Alias";
import Select from "../components/Select";
import Spinner from "../components/Spinner";
import Meta from "../components/meta";
import { Event } from "../context/P2PClient";
import { AppDispatchContext, AppStateContext } from "../context/state";
import { p2pData } from "../versioned/interface";

export enum State {
  IDLE = -1,
  LOADING = 0,
  AUTHORIZE = 10,
  AUTHORIZED = 20,
  REFUSED = 30,
  TRANSACTION = 40,
}

const Beacon = () => {
  const state = useContext(AppStateContext)!;
  const dispatch = useContext(AppDispatchContext)!;
  const router = useRouter();

  const searchParams = useSearchParams();
  const [data, setData] = useState<p2pData | undefined>();
  const [selectedWallet, setSelectedWallet] = useState({
    id: state.currentContract ?? "",
    value: state.currentContract ?? "",
    label: state.aliases[state.currentContract ?? ""],
  });
  const [validationState, setValidationState] = useState(State.LOADING);

  useEffect(() => {
    if (!state.currentContract) {
      router.replace("/");
      return;
    }

    if (
      !searchParams.has("data") ||
      !searchParams.has("type") ||
      !state.currentContract ||
      !state.p2pClient
    )
      return;

    const data = JSON.parse(
      new TextDecoder().decode(bs58check.decode(searchParams.get("data")!))
    ) as p2pData;

    setData(data);

    (async () => {
      state.p2pClient!.on(Event.PERMISSION_REQUEST, () => {
        setValidationState(State.AUTHORIZE);
      });

      state.p2pClient!.addPeer(data);
    })();
  }, [searchParams, state.currentContract, state.p2pClient]);

  return (
    <div className="min-h-content relative flex grow flex-col">
      <Meta title={"Connect - TzSafe"} />

      <div>
        <div className="mx-auto flex max-w-7xl justify-start px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-extrabold text-white">
            {!data ? <Spinner /> : `Connect to ${data?.name}`}
          </h1>
        </div>
      </div>
      <main className="mx-auto min-h-fit w-full max-w-7xl grow px-4 text-white sm:px-6 lg:px-8">
        {(() => {
          if (!data) return null;

          if (
            !!state.connectedDapps[data.id] &&
            validationState !== State.AUTHORIZED
          )
            return (
              <p>
                {data?.name} is already connected with{" "}
                {state.aliases[state.currentContract ?? ""]}
              </p>
            );

          // TODO: Pourquoi ça crash quand je retourne le message
          switch (validationState) {
            case State.LOADING:
              return <Spinner />;
            case State.AUTHORIZE:
              return (
                <>
                  <div className="w-full lg:w-1/3">
                    <Select
                      label="Wallet to connect"
                      value={selectedWallet}
                      options={Object.keys(state.contracts).map(address => ({
                        id: address,
                        value: address,
                        label: state.aliases[address],
                      }))}
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
                  <div className="mt-4 flex items-center space-x-4">
                    <button
                      type="button"
                      className="rounded border-2 bg-transparent px-3 py-1 font-medium text-white hover:outline-none"
                      onClick={async e => {
                        e.preventDefault();
                        if (!state.p2pClient!.hasReceivedPermissionRequest())
                          return;

                        await state.p2pClient!.refusePermission();
                        setValidationState(State.REFUSED);
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
                          !state.p2pClient!.hasReceivedPermissionRequest() ||
                          !state.currentContract
                        )
                          return;

                        setValidationState(State.LOADING);
                        await state.p2pClient!.approvePermission(
                          selectedWallet.value
                        );
                        setValidationState(State.AUTHORIZED);
                        dispatch({
                          type: "addDapp",
                          payload: data,
                        });
                      }}
                    >
                      Authorize
                    </button>
                  </div>
                </>
              );

            case State.AUTHORIZED:
              return (
                <p>
                  {data?.name} has been authorized to connect to{" "}
                  {state.aliases[state.currentContract ?? ""]}
                </p>
              );
            case State.REFUSED:
              return <p>You have refused the connection to {data?.name}</p>;
            default:
              break;
          }
        })()}
      </main>
    </div>
  );
};

export default Beacon;