import {
  BeaconMessageType,
  ProofOfEventChallengeRequestOutput,
} from "beacon-wallet";
import { useContext, useEffect, useState } from "react";
import { Event } from "../context/P2PClient";
import { AppStateContext } from "../context/state";
import { State } from "../pages/beacon";
import Spinner from "./Spinner";

const PoeModal = () => {
  const state = useContext(AppStateContext)!;
  const [message, setMessage] = useState<
    undefined | ProofOfEventChallengeRequestOutput
  >();
  const [currentState, setCurrentState] = useState(State.IDLE);

  useEffect(() => {
    if (!state.p2pClient) return;

    const cb = setMessage;

    const tinyEmitter = state.p2pClient.on(
      Event.PROOF_OF_EVENT_CHALLENGE_REQUEST,
      cb
    );

    return () => {
      tinyEmitter.off(Event.PROOF_OF_EVENT_CHALLENGE_REQUEST, cb);
    };
  }, [state.p2pClient]);

  if (!message) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 top-0 z-50 flex items-center justify-center bg-black/30">
      <div className="min-h-[96] w-1/3  rounded bg-graybg px-6 py-12 text-white">
        {(() => {
          switch (currentState) {
            case State.LOADING:
              return (
                <div className="flex items-center justify-center">
                  <Spinner />
                </div>
              );

            case State.AUTHORIZED:
              return (
                <>
                  <h1 className="text-lg font-medium">
                    Successfuly emited the event
                  </h1>
                  <div className="mt-4">
                    <button
                      className="rounded bg-primary px-4 py-2 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500"
                      onClick={() => {
                        setMessage(undefined);
                        setCurrentState(State.IDLE);
                      }}
                    >
                      Close
                    </button>
                  </div>
                </>
              );
            default:
              return (
                <>
                  <h1 className="text-lg font-medium">
                    {message.appMetadata.name} wants to perform a Proof Of Event
                    Challenge
                  </h1>
                  <p className="mt-4 font-light text-zinc-200">
                    {message.appMetadata.name} wants to check that you have the
                    rights to interact with{" "}
                    {state.aliases[state.currentContract ?? ""]}. To do so, it
                    requires to emit an event from the contract with the
                    following informations:
                  </p>
                  <ul className="mt-2 space-y-1">
                    <li className="truncate">
                      <span className="font-light">Challenge id:</span>{" "}
                      {state.p2pClient?.proofOfEvent.data?.challenge_id}
                    </li>
                    <li className="truncate">
                      <span className="font-light">Payload:</span>{" "}
                      {state.p2pClient?.proofOfEvent.data?.payload}
                    </li>
                  </ul>
                  <div className="mt-8 flex justify-around">
                    <button
                      className="rounded border-2 bg-transparent px-4 py-2 font-medium text-white hover:outline-none"
                      onClick={async () => {
                        await state.p2pClient?.refusePoeChallenge();
                        setMessage(undefined);
                      }}
                    >
                      Refuse
                    </button>
                    <button
                      className="rounded bg-primary px-4 py-2 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500"
                      onClick={async () => {
                        if (
                          !state.p2pClient!.hasReceivedPermissionRequest() ||
                          !state.currentContract
                        )
                          return;

                        setCurrentState(State.LOADING);

                        await state.p2pClient!.approvePoeChallenge();

                        const contract = await state.connection.wallet.at(
                          state.currentContract
                        );

                        const op = await contract.methodsObject
                          .proof_of_event_challenge(
                            state.p2pClient!.proofOfEvent.data
                          )
                          .send();

                        await op.confirmation(1);

                        setCurrentState(State.AUTHORIZED);
                      }}
                    >
                      Accept
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

export default PoeModal;
