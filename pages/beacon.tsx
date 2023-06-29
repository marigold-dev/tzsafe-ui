import {
  BEACON_VERSION,
  BeaconErrorType,
  BeaconMessageType,
  PermissionRequestOutput,
} from "beacon-wallet";
import bs58check from "bs58check";
import { useSearchParams } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import Spinner from "../components/Spinner";
import Meta from "../components/meta";
import { Event } from "../context/P2PClient";
import { AppStateContext } from "../context/state";

type data = {
  appUrl: string;
  id: string;
  name: string;
  publicKey: string;
  relayServer: string;
  type: string;
  version: string;
};

enum State {
  IDLE = -1,
  LOADING = 0,
  AUTHORIZE = 10,
  AUTHORIZED = 20,
  REFUSED = 30,
}

const Beacon = () => {
  const state = useContext(AppStateContext)!;
  const searchParams = useSearchParams();
  const [data, setData] = useState<data | undefined>();
  const [validationState, setValidationState] = useState(State.LOADING);
  const [permissionRequest, setPermissionRequest] = useState<
    PermissionRequestOutput | undefined
  >();

  useEffect(() => {
    if (
      !searchParams.has("data") ||
      !searchParams.has("type") ||
      !state.currentContract
    )
      return;

    const data = JSON.parse(
      new TextDecoder().decode(bs58check.decode(searchParams.get("data")!))
    ) as data;
    setData(data);

    (async () => {
      state.p2pClient.on(Event.PERMISSION_REQUEST, () => {
        setValidationState(State.AUTHORIZE);
      });

      state.p2pClient.on(Event.PROOF_OF_EVENT_CHALLENGE_REQUEST, () => {
        setValidationState(State.AUTHORIZED);
      });
      state.p2pClient.addPeer(data);
    })();
  }, [searchParams, state.currentContract]);

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
      <main className="min-h-fit grow px-4 text-white sm:px-6 lg:px-8">
        {(() => {
          if (!data) return null;

          switch (validationState) {
            case State.LOADING:
              return <Spinner />;
            case State.AUTHORIZE:
              return (
                <>
                  <p>
                    Do you want to authorize the connection to {data?.name} ?
                  </p>
                  <div className="flex items-center space-x-4">
                    <button
                      type="button"
                      className="rounded border-2 bg-transparent px-3 py-1 font-medium text-white hover:outline-none"
                      onClick={async e => {
                        e.preventDefault();
                        if (!permissionRequest) return;

                        await state.p2pClient.refusePermission();
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
                          !state.p2pClient.hasReceivedPermissionRequest() ||
                          !state.currentContract
                        )
                          return;

                        setValidationState(State.LOADING);
                        await state.p2pClient.approvePermission(
                          state.currentContract
                        );
                      }}
                    >
                      Authorize
                    </button>
                  </div>
                </>
              );

            case State.AUTHORIZED:
              return (
                <>
                  <p>
                    To finish to authorization of connection with {data.name},
                    you must sign a message to prove to {data.name} that you are
                    the owner of the wallet
                  </p>
                  <div className="flex items-center space-x-4">
                    <button
                      type="button"
                      className="rounded border-2 bg-transparent px-3 py-1 font-medium text-white hover:outline-none"
                      onClick={async e => {
                        e.preventDefault();
                        if (!permissionRequest) return;

                        await state.p2pClient.refusePoeChallenge();
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
                          !state.p2pClient.hasReceivedPermissionRequest() ||
                          !state.currentContract
                        )
                          return;

                        setValidationState(State.LOADING);
                        await state.p2pClient.approvePoeChallenge();
                        setValidationState(State.AUTHORIZED);

                        console.log("#1");
                        const contract = await state.connection.contract.at(
                          state.currentContract
                        );
                        console.log("#2");
                        console.log(contract);
                        const op = await contract.methods
                          .proof_of_event_challenge(
                            state.p2pClient.proofOfEvent.message
                          )
                          .send();
                        console.log("#3");
                        await op.confirmation(1);
                        console.log("#4");
                      }}
                    >
                      Sign
                    </button>
                  </div>
                </>
              );
            default:
              break;
          }
        })()}
      </main>
    </div>
  );
};

export default Beacon;
