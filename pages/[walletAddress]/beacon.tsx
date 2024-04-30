import { getSenderId } from "@airgap/beacon-sdk";
import { Cross1Icon } from "@radix-ui/react-icons";
import bs58check from "bs58check";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import Spinner from "../../components/Spinner";
import renderError from "../../components/formUtils";
import Meta from "../../components/meta";
import { Event } from "../../context/P2PClient";
import { useAliases } from "../../context/aliases";
import { MODAL_TIMEOUT } from "../../context/config";
import { useDapps, useP2PClient } from "../../context/dapps";
import { useAppDispatch, useAppState } from "../../context/state";
import { P2pData, ParsedUrlQueryContract } from "../../types/app";
import useIsOwner from "../../utils/useIsOwner";
import { hasTzip27Support } from "../../versioned/util";

export enum State {
  LOADING = -10,
  IDLE = -1,
  CODE = 0,
  AUTHORIZE = 10,
  AUTHORIZED = 20,
  REFUSED = 30,
  TRANSACTION = 40,
}

export function decodeData(data: string): P2pData {
  try {
    const decoded = JSON.parse(
      new TextDecoder().decode(bs58check.decode(data))
    );

    if ("name" in decoded && "id" in decoded && "relayServer" in decoded)
      return decoded as P2pData;
  } catch {}

  throw new Error("The code is not valid");
}

const Beacon = () => {
  const state = useAppState();
  const router = useRouter();
  const isOwner = useIsOwner();
  const p2pClient = useP2PClient();
  const { getDappsByContract, removeDapp, addDapp } = useDapps();
  const { addressBook } = useAliases();

  const searchParams = useSearchParams();
  const [data, setData] = useState<P2pData | undefined>();

  const [validationState, setValidationState] = useState(State.LOADING);
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState<undefined | string>(undefined);
  const [error, setError] = useState<undefined | string>(undefined);

  const { walletAddress: currentContract } =
    router.query as ParsedUrlQueryContract;

  useEffect(() => {
    if (
      !isOwner ||
      !hasTzip27Support(
        state.contracts[currentContract]?.version ??
          state.currentStorage?.version
      )
    ) {
      router.replace("/");
      return;
    }

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

    p2pClient.on(Event.PERMISSION_REQUEST, () => {
      setValidationState(State.AUTHORIZE);
    });

    p2pClient.addPeer(data);
  }, [searchParams, p2pClient, code, isOwner]);

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

  const connectedDapps = getDappsByContract(currentContract);

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
              {!connectedDapps ? (
                <p className="text-zinc-500">There are no connected Dapps</p>
              ) : (
                Object.values(connectedDapps).map(data => {
                  return (
                    <li
                      key={data.id}
                      className="flex w-full items-center space-x-6"
                    >
                      <button
                        className="rounded bg-primary p-1 text-sm text-white hover:bg-red-500 hover:outline-none focus:bg-red-500"
                        title="Disconnect"
                        onClick={() => {
                          removeDapp(data, currentContract);
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
            !!connectedDapps?.[data.id] &&
            validationState !== State.AUTHORIZED
          )
            return (
              <p>
                {data?.name} is already connected with{" "}
                {addressBook[currentContract]}
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
                    {addressBook[currentContract] ?? currentContract}
                  </p>
                  <div className="mt-4 flex items-center space-x-4">
                    <button
                      type="button"
                      className="rounded border-2 bg-transparent px-3 py-1 font-medium text-white hover:outline-none"
                      onClick={async e => {
                        e.preventDefault();
                        if (!p2pClient.hasReceivedPermissionRequest()) return;

                        await p2pClient.refusePermission();
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
                        if (!p2pClient.hasReceivedPermissionRequest()) return;

                        setValidationState(State.LOADING);
                        await p2pClient.approvePermission(currentContract);
                        setValidationState(State.AUTHORIZED);
                        addDapp(currentContract, data);
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
                  {`${data.name} has been authorized to connect to
                  ${addressBook[currentContract ?? ""] ?? currentContract}`}
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
