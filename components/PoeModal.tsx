import { InfoCircledIcon } from "@radix-ui/react-icons";
import { emitMicheline, Parser, Expr } from "@taquito/michel-codec";
import { Schema } from "@taquito/michelson-encoder";
import {
  AppMetadata,
  NetworkType,
  OperationRequestOutput,
  ProofOfEventChallengeRequestOutput,
  TezosOperationType,
} from "beacon-wallet";
import { useContext, useEffect, useMemo, useState } from "react";
import { Event } from "../context/P2PClient";
import { PREFERED_NETWORK } from "../context/config";
import { makeContractExecution } from "../context/contractExecution";
import { makeDelegateMichelson } from "../context/delegate";
import { AppDispatchContext, AppStateContext } from "../context/state";
import { State } from "../pages/beacon";
import { proposalContent } from "../types/display";
import useWalletTokens from "../utils/useWalletTokens";
import { VersionedApi } from "../versioned/apis";
import { transfer } from "../versioned/interface";
import RenderProposalContentLambda, {
  contentToData,
} from "./RenderProposalContentLambda";
import Spinner from "./Spinner";
import Tooltip from "./Tooltip";

export const transferToProposalContent = (
  transfer: transfer
): proposalContent => {
  if (
    transfer.type !== "lambda" &&
    transfer.type !== "transfer" &&
    transfer.type !== "contract"
  )
    throw new Error(`${transfer.type} is not handled`);

  switch (transfer.type) {
    case "lambda":
    case "contract":
      return {
        executeLambda: {
          metadata: transfer.values.metadata,
          content: transfer.values.lambda,
        },
      };
    case "transfer":
      return {
        transfer: {
          amount: Number(transfer.values.amount),
          destination: transfer.values.to,
        },
      };
  }
};
const PoeModal = () => {
  const state = useContext(AppStateContext)!;
  const dispatch = useContext(AppDispatchContext)!;

  const walletTokens = useWalletTokens();
  const [currentMetadata, setCurrentMetadata] = useState<
    undefined | [string, AppMetadata]
  >();
  const [message, setMessage] = useState<
    undefined | ProofOfEventChallengeRequestOutput
  >();
  const [transfers, setTransfers] = useState<transfer[] | undefined>();
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [transactionError, setTransactionError] = useState<undefined | string>(
    undefined
  );
  const [timeoutAndHash, setTimeoutAndHash] = useState([false, ""]);
  const [currentState, setCurrentState] = useState(State.IDLE);

  const rows = useMemo(
    () =>
      (transfers ?? []).map(t =>
        contentToData(transferToProposalContent(t), walletTokens ?? [])
      ),
    [transfers]
  );
  useEffect(() => {
    if (!state.p2pClient) return;

    const challengeCb = setMessage;
    const transactionCb = async (message: OperationRequestOutput) => {
      setCurrentMetadata([message.id, message.appMetadata]);

      setTransfers(
        (
          await Promise.all(
            message.operationDetails.map(async detail => {
              switch (detail.kind) {
                case TezosOperationType.TRANSACTION:
                  if (!!detail.parameters) {
                    try {
                      const contract = await state.connection.contract.at(
                        detail.destination
                      );

                      const methodSchema = new Schema(
                        contract.entrypoints.entrypoints[
                          detail.parameters.entrypoint
                        ]
                      );

                      const value = contract.methods[
                        detail.parameters.entrypoint
                      ](
                        methodSchema.Execute(detail.parameters.value)
                      ).toTransferParams().parameter?.value;

                      if (!value) return undefined;
                      const param = emitMicheline(value as Expr);

                      const parser = new Parser();

                      const type = emitMicheline(
                        parser.parseJSON(
                          contract.entrypoints.entrypoints[
                            detail.parameters.entrypoint
                          ]
                        ),
                        {
                          indent: "",
                          newline: "",
                        }
                      );

                      return {
                        type: "contract",
                        values: {
                          lambda: makeContractExecution({
                            address: detail.destination,
                            amount: Number(detail.amount),
                            entrypoint: detail.parameters.entrypoint,
                            type,
                            param,
                          }),
                          metadata: JSON.stringify({
                            mutez_amount: detail.amount,
                            contract_address: detail.destination,
                            entrypoint: detail.parameters.entrypoint,
                            payload: emitMicheline(detail.parameters.value),
                          }),
                        },
                      };
                    } catch (e) {
                      console.log("Error while converting contract call", e);

                      return undefined;
                    }
                  } else
                    return {
                      type: "transfer",
                      values: {
                        to: detail.destination,
                        amount: detail.amount,
                        parameters: {},
                      },
                    };

                case TezosOperationType.DELEGATION:
                  return !!detail.delegate
                    ? {
                        type: "lambda",
                        values: {
                          lambda: makeDelegateMichelson({
                            bakerAddress: detail.delegate,
                          }),
                          metadata: JSON.stringify({
                            baker_address: detail.delegate,
                          }),
                        },
                      }
                    : undefined;

                default:
                  return undefined;
              }
            })
          )
        ).filter(v => !!v) as transfer[]
      );

      setCurrentState(State.TRANSACTION);
    };

    const tinyEmitter = state.p2pClient.on(
      Event.PROOF_OF_EVENT_CHALLENGE_REQUEST,
      challengeCb
    );

    state.p2pClient.on(Event.INCOMING_OPERATION, transactionCb);

    return () => {
      tinyEmitter.off(Event.PROOF_OF_EVENT_CHALLENGE_REQUEST, challengeCb);
      tinyEmitter.off(Event.INCOMING_OPERATION, transactionCb);
    };
  }, [state.p2pClient]);

  if (!message && !transfers) return null;

  const reset = () => {
    setTransfers(undefined);
    setCurrentMetadata(undefined);
    setTimeoutAndHash([false, ""]);
    setTransactionError(undefined);
    setMessage(undefined);
    setCurrentState(State.IDLE);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 top-0 z-50 flex items-center justify-center bg-black/30">
      <div
        className={`min-h-[96] ${
          !!message ? "w-1/3" : "w-2/3"
        } rounded bg-graybg px-6 py-12 text-white`}
      >
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
                      onClick={reset}
                    >
                      Close
                    </button>
                  </div>
                </>
              );
            case State.TRANSACTION:
              if (!transfers) return null;

              if (transactionLoading)
                return (
                  <div className="flex w-full flex-col items-center justify-center">
                    <Spinner />
                    <span className="mt-4 text-zinc-400">
                      Sending and waiting for transaction confirmation (It may
                      take a few minutes)
                    </span>
                  </div>
                );

              if (timeoutAndHash[0])
                return (
                  <div className="col-span-2 flex w-full flex-col items-center justify-center">
                    <div className="mb-2 mt-4 self-start text-2xl font-medium text-white">
                      The wallet {"can't"} confirm that the transaction has been
                      validated. You can check it in{" "}
                      <a
                        className="text-zinc-200 hover:text-zinc-300"
                        href={`https://${
                          PREFERED_NETWORK === NetworkType.GHOSTNET
                            ? "ghostnet."
                            : ""
                        }tzkt.io/${timeoutAndHash[1]}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        the explorer
                      </a>
                      , and if it is, {"it'll"} appear in the proposals
                    </div>
                    <button
                      className="mt-6 rounded border-2 bg-transparent p-2 font-medium text-white hover:outline-none"
                      onClick={reset}
                    >
                      Close
                    </button>
                  </div>
                );

              if (!!transactionError)
                return (
                  <div className="col-span-2 flex w-full flex-col items-center justify-center">
                    <div className="mb-2 mt-4 text-center text-xl font-medium text-white">
                      {transactionError}
                    </div>
                    <button
                      className="mt-6 rounded border-2 bg-transparent p-2 font-medium text-white hover:outline-none"
                      onClick={reset}
                    >
                      Close
                    </button>
                  </div>
                );

              if (!timeoutAndHash[0] && !!timeoutAndHash[1])
                return (
                  <div className="col-span-2 flex w-full flex-col items-center justify-center">
                    <p>Succesfully created the proposal!</p>
                    <button
                      className="mt-6 rounded border-2 bg-transparent p-2 font-medium text-white hover:outline-none"
                      onClick={reset}
                    >
                      Close
                    </button>
                  </div>
                );
              return (
                <>
                  <div className="col-span-2 flex w-full flex-col items-center justify-center">
                    <div className="mb-2 mt-4 self-start text-2xl font-medium text-white">
                      Incoming action{(transfers?.length ?? 0) > 1 ? "s" : ""}{" "}
                      from {currentMetadata?.[1].name}
                    </div>
                    <div className="mb-2 flex w-full max-w-full flex-col items-start md:flex-col ">
                      <section className="w-full text-white">
                        <div className="mt-4 grid hidden w-full grid-cols-6 gap-4 text-zinc-500 lg:grid">
                          <span>Function</span>
                          <span className="flex items-center">
                            Metadata
                            <Tooltip text="Metadata is user defined. It may not reflect on behavior of lambda">
                              <InfoCircledIcon className="ml-2 h-4 w-4" />
                            </Tooltip>
                          </span>
                          <span className="justify-self-center">Amount</span>
                          <span className="justify-self-center">Address</span>
                          <span className="justify-self-end">Entrypoint</span>
                          <span className="justify-self-end">
                            Params/Tokens
                          </span>
                        </div>
                        <div className="mt-2 space-y-4 font-light lg:space-y-2">
                          {rows.map((v, i) => (
                            <RenderProposalContentLambda data={v} key={i} />
                          ))}
                        </div>
                      </section>
                    </div>
                    <div className="mt-6 flex w-2/3 justify-between md:w-1/3">
                      <button
                        className="my-2 rounded border-2 bg-transparent p-2 font-medium text-white hover:outline-none"
                        onClick={async e => {
                          if (!currentMetadata) return;

                          e.preventDefault();

                          await state.p2pClient?.abortRequest(
                            currentMetadata[0]
                          );
                          reset();
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className="hover:border-offset-2 hover:border-offset-gray-800 my-2 rounded bg-primary p-2 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500"
                        type="submit"
                        onClick={async () => {
                          if (!state.currentContract || !currentMetadata)
                            return;

                          setTransactionLoading(true);

                          let hash;
                          try {
                            const cc = await state.connection.contract.at(
                              state.currentContract
                            );
                            const versioned = VersionedApi(
                              state.contracts[state.currentContract].version,
                              state.currentContract
                            );
                            const timeoutAndHash =
                              await versioned.submitTxProposals(
                                cc,
                                state.connection,
                                { transfers },
                                false
                              );

                            hash = timeoutAndHash[1];

                            setTimeoutAndHash(timeoutAndHash);

                            if (timeoutAndHash[0]) {
                              setTransactionLoading(false);
                              return;
                            }
                          } catch (e) {
                            setTransactionLoading(false);
                            setTransactionError(
                              "Failed to create the transaction. Please try again later"
                            );
                            return;
                          }

                          try {
                            await state.p2pClient?.transactionResponse(
                              currentMetadata[0],
                              hash
                            );
                          } catch (e) {
                            setTransactionError(
                              `The proposal has been created, but we couldn't notify ${currentMetadata[1].name} of it`
                            );
                          }
                          dispatch({ type: "refreshProposals" });

                          setTransactionLoading(false);
                        }}
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                </>
              );
            default:
              if (!message) return null;

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
                          !state.p2pClient!.hasReceivedProofOfEventRequest() ||
                          !state.currentContract
                        )
                          return;

                        setCurrentState(State.LOADING);

                        try {
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
                        } catch (e) {
                          console.log(e);
                          setTransactionError(
                            "Failed to create and sign the Proof Of Event transaction"
                          );
                        }
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
