import bs58check from "bs58check";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/router";
import { useContext, useEffect, useRef, useState } from "react";
import Alias from "../components/Alias";
import Select from "../components/Select";
import Spinner from "../components/Spinner";
import renderError from "../components/formUtils";
import Meta from "../components/meta";
import { Event } from "../context/P2PClient";
import { AppDispatchContext, AppStateContext } from "../context/state";
import useIsOwner from "../utils/useIsOwner";
import { p2pData } from "../versioned/interface";

export enum State {
  LOADING = -10,
  IDLE = -1,
  CODE = 0,
  AUTHORIZE = 10,
  AUTHORIZED = 20,
  REFUSED = 30,
  TRANSACTION = 40,
}

function decodeData(data: string): p2pData {
  try {
    const decoded = JSON.parse(
      new TextDecoder().decode(bs58check.decode(data))
    );

    if ("name" in decoded && "id" in decoded && "relayServer" in decoded)
      return decoded as p2pData;
  } catch {
    throw new Error("The code is not valid");
  }

  throw new Error("The code is not valid");
}

const Beacon = () => {
  const state = useContext(AppStateContext)!;
  const dispatch = useContext(AppDispatchContext)!;
  const router = useRouter();
  const isOwner = useIsOwner();

  const searchParams = useSearchParams();
  const [data, setData] = useState<p2pData | undefined>();
  const [selectedWallet, setSelectedWallet] = useState({
    id: state.currentContract ?? "",
    value: state.currentContract ?? "",
    label: state.aliases[state.currentContract ?? ""] ?? state.currentContract,
  });
  const [validationState, setValidationState] = useState(State.LOADING);
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState<undefined | string>(undefined);
  const [error, setError] = useState<undefined | string>(undefined);

  useEffect(() => {
    if (!state.currentContract || !isOwner) {
      router.replace("/");
      return;
    }

    if (!state.currentContract || !state.p2pClient) return;

    if (!searchParams.has("data") && !searchParams.has("type") && !code) {
      setValidationState(State.CODE);
      return;
    }

    const data = decodeData((searchParams.get("data") ?? code) as string);

    if (
      data.appUrl === "http://localhost:3000" ||
      data.appUrl.includes("tzsafe")
    ) {
      setError("Sorry you can't pair Tzsafe with itself");
      return;
    }

    setData(data);

    state.p2pClient!.on(Event.PERMISSION_REQUEST, () => {
      setValidationState(State.AUTHORIZE);
    });

    state.p2pClient!.addPeer(data);
  }, [searchParams, state.currentContract, state.p2pClient, code, isOwner]);

  return (
    <div className="min-h-content relative flex grow flex-col">
      <Meta title={"Connect - TzSafe"} />

      <div>
        <div className="mx-auto flex max-w-7xl flex-col justify-start px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-extrabold text-white">
            {validationState === State.CODE ? (
              `Please enter the beacon code`
            ) : !data ? (
              <Spinner />
            ) : (
              `Connect to ${data?.name}`
            )}
          </h1>
          {validationState === State.CODE && (
            <p className="mt-2 text-sm text-zinc-400 lg:w-1/2">
              To obtain the code, go to the beacon connection modal in the Dapp,
              click on {`"Show QR code"`}, then {`"beacon"`} and click on Copy
              to clipboard. You can then paste the code below
            </p>
          )}
        </div>
      </div>
      <main className="mx-auto min-h-fit w-full max-w-7xl grow px-4 text-white sm:px-6 lg:px-8">
        {(() => {
          if (validationState === State.CODE)
            return (
              <>
                <section className="flex space-x-4">
                  <input
                    className="xl:text-md relative h-fit min-h-fit w-full rounded p-2 text-sm text-zinc-900 xl:w-full"
                    placeholder="46uj6hGagm..."
                    ref={inputRef}
                  />
                  <button
                    type="button"
                    className={
                      "mx-none block self-center justify-self-end rounded bg-primary p-1.5 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500 md:mx-auto md:self-end"
                    }
                    onClick={e => {
                      e.preventDefault();
                      if (!inputRef.current) return;

                      try {
                        const data = decodeData(inputRef.current.value);

                        if (
                          data.appUrl === "http://localhost:3000" ||
                          data.appUrl.includes("tzsafe")
                        ) {
                          setError("Sorry you can't pair Tzsafe with itself");
                          return;
                        }
                        setCode(inputRef.current.value);
                        setValidationState(State.LOADING);
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    Connect
                  </button>
                </section>
                {renderError(error, true)}
              </>
            );

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
                          payload: { data, address: selectedWallet.value },
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
                  {state.aliases[selectedWallet.value ?? ""] ??
                    selectedWallet.value}
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
