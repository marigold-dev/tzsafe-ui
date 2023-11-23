import { getSenderId } from "@airgap/beacon-sdk";
import { Cross1Icon } from "@radix-ui/react-icons";
import bs58check from "bs58check";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/router";
import { useContext, useEffect, useRef, useState } from "react";
import Spinner from "../../components/Spinner";
import renderError from "../../components/formUtils";
import Meta from "../../components/meta";
import { Event } from "../../context/P2PClient";
import { MODAL_TIMEOUT } from "../../context/config";
import { AppDispatchContext, AppStateContext } from "../../context/state";
import useIsOwner from "../../utils/useIsOwner";
import { Versioned, p2pData } from "../../versioned/interface";

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

  const [validationState, setValidationState] = useState(State.LOADING);
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState<undefined | string>(undefined);
  const [error, setError] = useState<undefined | string>(undefined);

  useEffect(() => {
    if (
      !state.currentContract ||
      !isOwner ||
      !Versioned.hasPoeSupport(
        state.contracts[state.currentContract ?? ""]?.version ??
          state.currentStorage?.version
      )
    ) {
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
      data.appUrl.includes("tzsafe") ||
      data.name.toLowerCase() === "tzsafe"
    ) {
      setError("Sorry you can't pair TzSafe with itself");
      return;
    }

    setData(data);

    state.p2pClient!.on(Event.PERMISSION_REQUEST, () => {
      setValidationState(State.AUTHORIZE);
    });

    state.p2pClient!.addPeer(data);
  }, [searchParams, state.currentContract, state.p2pClient, code, isOwner]);

  useEffect(() => {
    if (
      validationState !== State.AUTHORIZED &&
      validationState !== State.REFUSED
    )
      return;

    const id = setTimeout(() => {
      setValidationState(State.CODE);
    }, MODAL_TIMEOUT);

    return () => {
      clearTimeout(id);
    };
  }, [validationState]);

  const connectedDapps = Object.values(
    state.connectedDapps[state.currentContract ?? ""] ?? {}
  );

  return (
    <div className="min-h-content relative flex grow flex-col">
      <Meta title={"Connect - TzSafe"} />

      <div>
        <div className="mx-auto flex max-w-7xl flex-col justify-start px-4 py-6 sm:px-6 lg:px-8">
          <section className="mb-4 text-white">
            <h1 className="text-xl font-extrabold text-white">
              Connected Dapps
            </h1>

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
                          const senderId = await getSenderId(data.publicKey);

                          state.p2pClient?.removePeer(
                            {
                              ...data,
                              type: "p2p-pairing-response",
                              senderId,
                            },
                            true
                          );

                          await state.p2pClient?.removeAppMetadata(senderId);

                          dispatch({
                            type: "removeDapp",
                            payload: data.appUrl,
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
          <h1 className="mt-8 text-xl font-extrabold text-white">
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
              click on {`"Show QR code"`}, then select {`"beacon"`} and click on
              {`"Copy to clipboard"`}. You can then paste the code below
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
                          data.appUrl.includes("tzsafe") ||
                          data.name.toLowerCase() === "tzsafe"
                        ) {
                          setError("Sorry you can't pair TzSafe with itself");
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
                  <p>
                    Do you want to allow the connection to{" "}
                    {state.aliases[state.currentContract ?? ""] ??
                      state.currentContract}
                  </p>
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
                          state.currentContract
                        );
                        setValidationState(State.AUTHORIZED);
                        dispatch({
                          type: "addDapp",
                          payload: { data, address: state.currentContract },
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
                  {state.aliases[state.currentContract ?? ""] ??
                    state.currentContract}
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
