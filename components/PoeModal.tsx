import {
  AppMetadata,
  BeaconErrorType,
  NetworkType,
  OperationRequestOutput,
  ProofOfEventChallengeRequestOutput,
  SignPayloadRequest,
  SimulatedProofOfEventChallengeRequest,
  TezosOperationType,
} from "@airgap/beacon-sdk";
import { Checkbox } from "@ariakit/react";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import * as Switch from "@radix-ui/react-switch";
import { emitMicheline, Parser, Expr } from "@taquito/michel-codec";
import { Schema } from "@taquito/michelson-encoder";
import { tzip16 } from "@taquito/tzip16";
import { validateAddress, ValidationResult } from "@taquito/utils";
import BigNumber from "bignumber.js";
import { usePathname } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Event } from "../context/P2PClient";
import { useAliases } from "../context/aliases";
import { PREFERED_NETWORK } from "../context/config";
import { useP2PClient } from "../context/dapps";
import {
  generateDelegateMichelson,
  generateExecuteContractMichelson,
} from "../context/generateLambda";
import { useAppDispatch, useAppState } from "../context/state";
import { useTezosToolkit } from "../context/tezos-toolkit";
import fetchVersion from "../context/version";
import { useWallet } from "../context/wallet";
import { CustomView, customViewMatchers } from "../dapps";
import { State } from "../pages/[walletAddress]/beacon";
import { proposalContent } from "../types/display";
import useWalletTokens from "../utils/useWalletTokens";
import { signers, toStorage, VersionedApi } from "../versioned/apis";
import { transfer } from "../versioned/interface";
import { hasTzip27SupportWithPoEChallenge } from "../versioned/util";
import Alias from "./Alias";
import RenderProposalContentLambda, {
  contentToData,
  transaction,
} from "./RenderProposalContentLambda";
import Spinner from "./Spinner";
import Tooltip from "./Tooltip";
import { TryImg } from "./TryImg";

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
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { userAddress } = useWallet();

  const { tezos } = useTezosToolkit();
  const p2pClient = useP2PClient();
  const { addressBook } = useAliases();

  const path = usePathname();

  const walletTokens = useWalletTokens();
  const [currentMetadata, setCurrentMetadata] = useState<
    undefined | [string, AppMetadata]
  >();
  const [address, setAddress] = useState<undefined | string>();
  const [message, setMessage] = useState<
    undefined | ProofOfEventChallengeRequestOutput
  >();
  const [transfers, setTransfers] = useState<transfer[] | undefined>();
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [transactionError, setTransactionError] = useState<undefined | string>(
    undefined
  );
  const [timeoutAndHash, setTimeoutAndHash] = useState([false, ""]);
  const [hasDefaultView, setHasDefaultView] = useState(false);
  const [currentState, setCurrentState] = useState(State.IDLE);

  const [signImmediatelyFlag, setSignImmediatelyFlag] = useState(true);
  const [resolveImmediatelyFlag, setResolveImmediatelyFlag] = useState(false);

  const version =
    state.contracts[address ?? ""]?.version ?? state.currentStorage?.version;

  const { rows, dapp } = useMemo(() => {
    const rows = (transfers ?? []).map(t =>
      contentToData(version, transferToProposalContent(t), walletTokens ?? [])
    );

    let dapp: CustomView;

    try {
      for (let i = 0; i < customViewMatchers.length; ++i) {
        dapp = customViewMatchers[i](rows as transaction[], tezos);
        if (!!dapp) break;
      }
    } catch (e) {
      console.log("Failed to parse dapp:", e);
    }
    return { rows, dapp };
  }, [transfers]);

  useEffect(() => {
    const challengeCb = (message: ProofOfEventChallengeRequestOutput) => {
      setMessage(message);
      setAddress(message.contractAddress);
    };

    const transactionCb = async (message: OperationRequestOutput) => {
      if (!state.contracts[message.sourceAddress]) {
        p2pClient.abortRequest(
          message.id,
          "The contract is not an imported TzSafe one"
        );
        return;
      }

      if (!!currentMetadata) {
        p2pClient.abortRequest(message.id, "There's already a pending request");
        return;
      }
      setAddress(message.sourceAddress);
      setCurrentMetadata([message.id, message.appMetadata]);

      if (message.operationDetails.length === 0) {
        await p2pClient.sendError(
          message.id,
          "Request was empty",
          BeaconErrorType.TRANSACTION_INVALID_ERROR
        );
        setTransactionError("Operations were empty");
        return;
      }

      const version = state.contracts[message.sourceAddress].version;

      const transfers = (await Promise.all(
        message.operationDetails.map(async detail => {
          switch (detail.kind) {
            case TezosOperationType.TRANSACTION:
              if (!!detail.parameters) {
                try {
                  const contract = await tezos.contract.at(detail.destination);

                  if (
                    !contract.entrypoints.entrypoints[
                      detail.parameters.entrypoint
                    ]
                  ) {
                    throw new Error(
                      `'${detail.parameters.entrypoint}' is not a valid entrypoint for ${detail.destination}`
                    );
                  }

                  if (
                    isNaN(Number(detail.amount)) ||
                    Number(detail.amount) < 0
                  ) {
                    throw new Error(`'${detail.amount}' is not a valid amount`);
                  }

                  const methodSchema = new Schema(
                    contract.entrypoints.entrypoints[
                      detail.parameters.entrypoint
                    ]
                  );

                  const value = contract.methodsObject[
                    detail.parameters.entrypoint
                  ](
                    methodSchema.Execute(detail.parameters.value)
                  ).toTransferParams().parameter?.value;

                  if (!value) {
                    throw new Error("Failed to convert the parameters");
                  }

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
                      lambda: generateExecuteContractMichelson(version, {
                        address: detail.destination,
                        amount: Number(detail.amount),
                        entrypoint: detail.parameters.entrypoint,
                        type,
                        param,
                      }),
                      metadata: null,
                    },
                  };
                } catch (e) {
                  const errorMessage = `Failed to create a TzSafe proposal: ${
                    (e as Error).message
                  }`;
                  setTransactionError(errorMessage);
                  console.log("Contract conversion error:", e);

                  p2pClient
                    ?.sendError(
                      message.id,
                      errorMessage,
                      BeaconErrorType.TRANSACTION_INVALID_ERROR
                    )
                    .catch(_ => {});
                  return undefined;
                }
              } else {
                if (
                  validateAddress(detail.destination) !==
                    ValidationResult.VALID ||
                  isNaN(Number(detail.amount)) ||
                  Number(detail.amount) < 0
                ) {
                  p2pClient.sendError(
                    message.id,
                    "Invalid parameters",
                    BeaconErrorType.TRANSACTION_INVALID_ERROR
                  );
                  return undefined;
                }

                return {
                  type: "transfer",
                  values: {
                    to: detail.destination,
                    amount: detail.amount,
                    parameters: {},
                  },
                };
              }

            case TezosOperationType.DELEGATION:
              if (
                validateAddress(detail.delegate ?? "") !==
                ValidationResult.VALID
              ) {
                p2pClient.sendError(
                  message.id,
                  "Invalid delegation addess " + detail.delegate,
                  BeaconErrorType.TRANSACTION_INVALID_ERROR
                );

                return undefined;
              }

              return {
                type: "lambda",
                values: {
                  lambda: generateDelegateMichelson(version, {
                    bakerAddress: detail.delegate!,
                  }),
                  metadata: JSON.stringify({
                    baker_address: detail.delegate,
                  }),
                },
              };

            default:
              return undefined;
          }
        })
      )) as transfer[];

      // Even if there's an error, setting transfers is a requirement to show the modal
      setTransfers(transfers.filter(v => !!v));

      setCurrentState(State.TRANSACTION);
    };

    const signPayloadCb = async (message: SignPayloadRequest) => {
      try {
        const contract = await tezos.wallet.at(message.sourceAddress, tzip16);

        const storage: any = await contract.storage();
        let version = await fetchVersion(contract!);

        if (version === "unknown version") {
          p2pClient.abortRequest(message.id, "Current user isn't a signer");

          throw new Error("The contract is not a TzSafe contract");
        }

        let v = toStorage(version, storage, BigNumber(0));

        if (!signers(v).includes(userAddress ?? "")) {
          p2pClient.abortRequest(message.id, "Current user isn't a signer");
          return;
        }

        const signed =
          //@ts-expect-error For a reason I don't know I can't access client like in taquito documentation
          // See: https://tezostaquito.io/docs/signing/#generating-a-signature-with-beacon-sdk
          await tezos.wallet.walletProvider.client.requestSignPayload({
            signingType: message.signingType,
            payload: message.payload,
            sourceAddress: userAddress,
          });
        await p2pClient.signResponse(
          message.id,
          message.signingType,
          signed.signature
        );
      } catch (e) {
        p2pClient.sendError(
          message.id,
          `Failed to sign the payload: ${(e as Error).message}`,
          BeaconErrorType.SIGNATURE_TYPE_NOT_SUPPORTED
        );
      }
    };

    const simulatedProofOfEventCb = async (
      message: SimulatedProofOfEventChallengeRequest
    ) => {
      const contract = state.contracts[message.contractAddress];

      if (!contract) {
        p2pClient.sendError(
          message.id,
          "The address is not a TzSafe one",
          BeaconErrorType.UNKNOWN_ERROR
        );
        return;
      }

      const api = VersionedApi(contract.version, message.contractAddress);

      try {
        const ops = await api.generateSpoeOps(
          message.payload,
          await tezos.wallet.at(message.contractAddress),
          tezos
        );

        await p2pClient.spoeResponse(message.id, ops);
      } catch (e) {
        await p2pClient.spoeResponse(message.id, [], (e as Error).message);
      }
    };

    const tinyEmitter = p2pClient.on(
      Event.PROOF_OF_EVENT_CHALLENGE_REQUEST,
      challengeCb
    );

    p2pClient.on(Event.INCOMING_OPERATION, transactionCb);
    p2pClient.on(Event.SIGN_PAYLOAD, signPayloadCb);
    p2pClient.on(
      Event.SIMULATED_PROOF_OF_EVENT_CHALLENGE_REQUEST,
      simulatedProofOfEventCb
    );

    return () => {
      tinyEmitter.off(Event.PROOF_OF_EVENT_CHALLENGE_REQUEST, challengeCb);
      tinyEmitter.off(Event.INCOMING_OPERATION, transactionCb);
      tinyEmitter.off(Event.SIGN_PAYLOAD, signPayloadCb);
      tinyEmitter.off(
        Event.SIMULATED_PROOF_OF_EVENT_CHALLENGE_REQUEST,
        simulatedProofOfEventCb
      );
    };
  }, [p2pClient, userAddress]);

  if (!message && !transfers) return null;

  const reset = () => {
    setTransfers(undefined);
    setCurrentMetadata(undefined);
    setTimeoutAndHash([false, ""]);
    setTransactionError(undefined);
    setMessage(undefined);
    setCurrentState(State.IDLE);
    setAddress(undefined);
  };

  const Checkboxes = () => (
    <>
      <div className="md-2 flex w-full items-center space-x-4 pt-8">
        <label className="font-medium text-white">Sign immediately:</label>
        <Checkbox
          name="signImmediatelyFlag"
          type="checkbox"
          checked={signImmediatelyFlag}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            if (!e.target.checked) {
              setResolveImmediatelyFlag(e.target.checked);
            }
            setSignImmediatelyFlag(e.target.checked);
          }}
          className="h-4 w-4 rounded-md p-2"
        />
      </div>

      {state.currentContract &&
        state.contracts[state.currentContract]?.threshold.toNumber() <= 1 && (
          <div className="md-2 flex w-full items-center space-x-4">
            <label className="font-medium text-white">
              Resolve immediately:
            </label>
            <Checkbox
              disabled={!signImmediatelyFlag}
              checked={resolveImmediatelyFlag}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setResolveImmediatelyFlag(e.target.checked);
              }}
              name="resolveImmediatelyFlag"
              type="checkbox"
              className="h-4 w-4 rounded-md p-2"
            />
          </div>
        )}
    </>
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 top-12 z-50 flex items-center justify-center bg-black/30">
      <div
        className={`max-h-[90%] min-h-[96] w-[90%] overflow-auto ${
          !!message ? "lg:w-1/3" : "lg:w-2/3"
        } rounded bg-graybg px-3 py-6 text-white lg:px-6 lg:py-12`}
      >
        {(() => {
          switch (currentState) {
            case State.LOADING:
              return (
                <div className="flex items-center justify-center">
                  <Spinner />
                </div>
              );

            case State.TRANSACTION:
              if (transactionLoading)
                return (
                  <div className="flex w-full flex-col items-center justify-center">
                    <Spinner />
                    <span className="mt-4 text-center text-zinc-400">
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
                    <div className="mb-2 mt-4 w-full text-center text-xl font-medium text-white">
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
                  <div className="col-span-2 flex w-full flex-col items-center justify-center text-center">
                    <p>Succesfully created the proposal!</p>
                    <button
                      className="mt-6 rounded border-2 bg-transparent p-2 font-medium text-white hover:outline-none"
                      onClick={reset}
                    >
                      Close
                    </button>
                  </div>
                );

              if (!transfers) return null;

              return (
                <>
                  <div
                    className={`col-span-2 flex w-full flex-col ${
                      hasDefaultView ? "items-center" : ""
                    } justify-center`}
                  >
                    <div className="mb-2 self-start text-2xl font-medium text-white">
                      Incoming action{(transfers?.length ?? 0) > 1 ? "s" : ""}{" "}
                      from {currentMetadata?.[1].name}
                    </div>
                    <p className="self-start text-sm text-zinc-400">
                      <Alias address={address ?? ""} /> will create the proposal
                    </p>
                    {state.currentContract !== address && (
                      <p className="self-start text-sm text-yellow-500">
                        The signing wallet is different from{" "}
                        <Alias address={state.currentContract ?? ""} />
                      </p>
                    )}
                    {!!dapp?.logo && (
                      <a
                        className="mt-4 flex space-x-2 self-start"
                        href={dapp.logoLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <h3>{dapp.dappName}</h3>
                        <img
                          src={dapp.logo}
                          alt={dapp.dappName}
                          className="h-6 w-6"
                        />
                      </a>
                    )}
                    {!dapp?.data || hasDefaultView ? (
                      <>
                        <div className="mt-4 grid hidden w-full grid-cols-6 gap-4 text-zinc-500 lg:grid">
                          <span>Function</span>
                          <span className="flex items-center">
                            Note
                            <Tooltip text="The note is user defined. It may not reflect on behavior of lambda">
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
                        <div className="mt-2 w-full space-y-4 font-light lg:space-y-2">
                          {rows.length > 0
                            ? rows.map((v, i) => (
                                <RenderProposalContentLambda
                                  key={i}
                                  data={v}
                                  isOpenToken={i === 0}
                                />
                              ))
                            : []}
                        </div>
                      </>
                    ) : (
                      <div className="mt-4 space-y-2 font-light">
                        {dapp.data.map((viewData, i) => {
                          return (
                            <section key={i}>
                              <h3
                                className={`font-normal ${
                                  dapp.data?.length === 1 &&
                                  !viewData.link &&
                                  dapp.data[0].action === dapp.label
                                    ? "hidden"
                                    : ""
                                }`}
                              >
                                {viewData.link ? (
                                  <a
                                    href={viewData.link}
                                    title={viewData.action}
                                    className="underline"
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    {viewData.action}
                                  </a>
                                ) : (
                                  viewData.action
                                )}
                              </h3>
                              <div className="mt-1 flex list-inside items-center space-x-4">
                                {viewData.image && (
                                  <TryImg
                                    src={viewData.image}
                                    className="h-auto w-16 rounded"
                                    alt={`${viewData.action}'s image`}
                                  />
                                )}
                                {viewData.description}
                              </div>
                              {!!viewData.price && (
                                <div className="mt-2">
                                  Price: {viewData.price}
                                </div>
                              )}
                            </section>
                          );
                        })}
                      </div>
                    )}

                    {!!dapp?.data && (
                      <div className="mt-6 flex w-full justify-end space-x-2">
                        <label className="font-light" htmlFor="advanced-mode">
                          Advanced mode
                        </label>
                        <Switch.Root
                          defaultChecked={false}
                          className="relative h-[25px] w-[42px] rounded-full bg-zinc-900 transition-colors data-[state='checked']:bg-primary"
                          id="advanced-mode"
                          onCheckedChange={setHasDefaultView}
                        >
                          <Switch.Thumb className="block h-[21px] w-[21px] translate-x-[2px] rounded-full bg-white transition-transform will-change-transform data-[state='checked']:translate-x-[19px]" />
                        </Switch.Root>
                      </div>
                    )}

                    <Checkboxes />

                    <div className="mt-6 flex w-2/3 justify-between md:mx-auto md:w-1/3">
                      <button
                        className="my-2 rounded border-2 bg-transparent p-2 font-medium text-white hover:outline-none"
                        onClick={async e => {
                          if (!currentMetadata) return;

                          e.preventDefault();

                          const metadata = currentMetadata[0];
                          reset();
                          await p2pClient.abortRequest(
                            metadata,
                            "Cancelled by the user"
                          );
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className="hover:border-offset-2 hover:border-offset-gray-800 my-2 rounded bg-primary p-2 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500"
                        type="submit"
                        onClick={async () => {
                          if (!address || !currentMetadata) return;

                          setTransactionLoading(true);

                          let hash;
                          try {
                            const cc = await tezos.wallet.at(address);
                            const versioned = VersionedApi(
                              state.contracts[address].version,
                              address
                            );
                            const submitTimeoutAndHash =
                              await versioned.submitTxProposals(
                                cc,
                                tezos,
                                { transfers },
                                false,
                                undefined,
                                signImmediatelyFlag,
                                resolveImmediatelyFlag
                              );

                            hash = submitTimeoutAndHash[1];

                            setTimeoutAndHash(submitTimeoutAndHash);

                            if (timeoutAndHash[0]) {
                              setTransactionLoading(false);
                              return;
                            }

                            if (
                              path?.endsWith("proposals") &&
                              address === state.currentContract
                            ) {
                              dispatch({ type: "refreshProposals" });
                            }
                          } catch (e) {
                            p2pClient.abortRequest(
                              currentMetadata[0],
                              "User cancelled the transaction"
                            );
                            setTransactionLoading(false);
                            setTransactionError(
                              "Failed to create the transaction. Please try again later"
                            );

                            return;
                          }

                          try {
                            await p2pClient.transactionResponse(
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

              return hasTzip27SupportWithPoEChallenge(version) ? (
                <>
                  <h1 className="text-lg font-medium">
                    Message Signing Request from {message.appMetadata.name}
                  </h1>
                  <p className="mt-4 font-light text-zinc-200">
                    {`${message.appMetadata.name} requests message signing from
                    ${addressBook[address ?? ""]}. The payload of the message
                    is as follows:`}
                  </p>
                  <ul className="mt-2 space-y-1">
                    <li className="truncate">
                      <span className="font-light">{`Payload: `}</span>
                      {p2pClient.proofOfEvent.data?.payload}
                    </li>
                  </ul>

                  <Checkboxes />

                  <div className="mt-8 flex justify-around">
                    <button
                      className="rounded border-2 bg-transparent px-4 py-2 font-medium text-white hover:outline-none"
                      onClick={async () => {
                        await p2pClient.refusePoeChallenge();
                        reset();
                      }}
                    >
                      Refuse
                    </button>
                    <button
                      className="rounded bg-primary px-4 py-2 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500"
                      onClick={async () => {
                        if (
                          !p2pClient.hasReceivedProofOfEventRequest() ||
                          !address
                        )
                          return;

                        setTransactionLoading(true);

                        try {
                          setCurrentState(State.TRANSACTION);

                          const cc = await tezos.wallet.at(address);
                          const versioned = VersionedApi(
                            state.contracts[address].version,
                            address
                          );

                          setTimeoutAndHash(
                            await versioned.submitTxProposals(
                              cc,
                              tezos,
                              {
                                transfers: [
                                  {
                                    type: "poe",
                                    values: {
                                      payload:
                                        p2pClient.proofOfEvent.data?.payload ??
                                        "",
                                    },
                                    fields: [],
                                  },
                                ],
                              },
                              false,
                              undefined,
                              signImmediatelyFlag,
                              resolveImmediatelyFlag
                            )
                          );

                          if (timeoutAndHash[0]) {
                            setTransactionLoading(false);
                            return;
                          }

                          await p2pClient.approvePoeChallenge();

                          dispatch({ type: "refreshProposals" });
                        } catch (e) {
                          setTransactionError(
                            "Failed to create message signing proposal (TZIP27)."
                          );

                          if (
                            (e as Error).message.includes("[ABORTED_ERROR]")
                          ) {
                            await p2pClient.dismissPoeChallenge();
                          } else {
                            await p2pClient.sendError(
                              p2pClient.proofOfEvent.message!.id,
                              (e as Error).message,
                              BeaconErrorType.UNKNOWN_ERROR
                            );
                          }
                        }
                        setTransactionLoading(false);
                      }}
                    >
                      Accept
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h1 className="text-lg font-medium">
                    Does not support message signing {"(TZIP27)"}
                  </h1>
                  <p className="mt-4 font-light text-zinc-200">
                    {`${addressBook[address ?? ""]} version is ${version};
                    however, version 0.3.4 or higher is required.`}
                  </p>
                  <div className="mt-8 flex justify-around">
                    <button
                      className="rounded border-2 bg-transparent px-4 py-2 font-medium text-white hover:outline-none"
                      onClick={async () => {
                        await p2pClient.refusePoeChallenge();
                        reset();
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

export default PoeModal;
