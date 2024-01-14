import { NetworkType } from "@airgap/beacon-sdk";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import BigNumber from "bignumber.js";
import { Field, Form, Formik } from "formik";
import { useRouter } from "next/router";
import React, { useContext, useState, useMemo } from "react";
import { MODAL_TIMEOUT, PREFERED_NETWORK } from "../context/config";
import { PROPOSAL_DURATION_WARNING } from "../context/config";
import { AppStateContext } from "../context/state";
import { version, proposal } from "../types/display";
import { canExecute, canReject } from "../utils/proposals";
import { walletToken } from "../utils/useWalletTokens";
import { VersionedApi, signers } from "../versioned/apis";
import ErrorMessage from "./ErrorMessage";
import RenderProposalContentLambda, {
  contentToData,
} from "./RenderProposalContentLambda";
import Tooltip from "./Tooltip";
import ContractLoader from "./contractLoader";

function ProposalSignForm({
  address,
  proposal,
  id,
  version,
  state: modalState,
  closeModal,
  threshold,
  onSuccess,
  walletTokens,
}: {
  address: string;
  proposal: { og: any; ui: proposal };
  version: version;
  threshold: number;
  id: number;
  state: boolean | undefined;
  closeModal: (success: boolean) => void;
  walletTokens: walletToken[];
  onSuccess?: () => void;
}) {
  const state = useContext(AppStateContext)!;
  const currentContract = state.currentContract ?? "";

  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [timeoutAndHash, setTimeoutAndHash] = useState([false, ""]);
  const [result, setResult] = useState<undefined | boolean>(undefined);

  const rows = useMemo(
    () =>
      proposal.ui.content.map(v =>
        contentToData(
          state.contracts[currentContract]?.version ??
            state.currentStorage?.version,
          v,
          walletTokens
        )
      ),
    [
      proposal.ui.content,
      state.currentContract,
      state.contracts,
      state.currentStorage,
    ]
  );

  async function sign(
    proposal: number,
    prop: any,
    result: boolean | undefined,
    resolve: boolean
  ) {
    let cc = await state.connection.wallet.at(address);
    let versioned = VersionedApi(version, address);

    setTimeoutAndHash(
      await versioned.signProposal(
        cc,
        state.connection,
        new BigNumber(proposal),
        result,
        resolve
      )
    );
  }

  if (timeoutAndHash[0]) {
    return (
      <div className="mx-auto mt-4 w-full text-center text-zinc-400">
        <p>
          The wallet {"can't"} confirm that the transaction has been validated.
          You can check it in{" "}
          <a
            className="text-zinc-200 hover:text-zinc-300"
            href={`https://${
              PREFERED_NETWORK === NetworkType.MAINNET
                ? ""
                : PREFERED_NETWORK === NetworkType.GHOSTNET
                ? "ghostnet."
                : `${PREFERED_NETWORK}.`
            }tzkt.io/${timeoutAndHash[1]}`}
            target="_blank"
            rel="noreferrer"
          >
            the explorer
          </a>
          , and if it is, and the proposal is resolved, it will appear in the
          history, otherwise it will still remain in the proposals with updating
          status
        </p>
        <div className="w-full space-x-4">
          <button
            className="rounded border-2 bg-transparent px-4 py-2 font-medium text-white hover:outline-none"
            onClick={() => closeModal(false)}
          >
            Close
          </button>
          <button
            className="mt-8 rounded border-2 border-primary bg-primary px-4 py-2 font-medium text-white hover:border-red-500 hover:bg-red-500"
            onClick={() => {
              router.push("/history");
            }}
          >
            Go to history
          </button>
        </div>
      </div>
    );
  }

  if (loading && typeof result == "undefined") {
    return (
      <div className="flex w-full flex-col items-center justify-center">
        <ContractLoader loading={loading}></ContractLoader>
        <span className="mt-4 text-zinc-400">
          Sending and waiting for transaction confirmation (It may take a few
          minutes)
        </span>
      </div>
    );
  }
  if (!loading && typeof result != "undefined") {
    return (
      <div className="flex w-full items-center justify-between md:h-12">
        <ContractLoader loading={loading}>
          {result ? (
            <div className="my-auto flex flex-row text-sm font-bold text-white md:text-xl">
              <span>Operation successful</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="ml-4 h-6 w-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            </div>
          ) : (
            <span className="my-auto text-sm font-bold text-white md:text-xl">
              Failed to sign
            </span>
          )}
        </ContractLoader>
      </div>
    );
  }

  const allSigners = signers(
    state.contracts[currentContract] ?? state.currentStorage
  );

  const signatures = proposal.ui.signatures.filter(({ signer }) =>
    allSigners.includes(signer)
  );

  const isExecutable = canExecute(signatures, threshold);
  const isRejectable = canReject(signatures, threshold, allSigners.length);
  const isSignOrResolve =
    (typeof modalState === "boolean" && modalState) ||
    (typeof modalState !== "boolean" && isExecutable);

  return (
    <Formik
      initialValues={{
        flag: false,
      }}
      onSubmit={async values => {
        setLoading(true);

        let success = true;
        try {
          await sign(
            id,
            proposal.og,
            modalState,
            typeof modalState === "undefined" ? true : values.flag
          );
          onSuccess?.();
          setResult(true);
          setLoading(false);
        } catch (e) {
          success = false;
          console.log("Sign error: ", e);
          setResult(false);
        }
        setLoading(false);
        setTimeout(() => {
          closeModal(success);
        }, MODAL_TIMEOUT);
      }}
    >
      <Form className="col-span-2 flex w-full flex-col items-center justify-center">
        <div className="mb-2 mt-4 self-start text-2xl font-medium text-white">
          Review and confirm the action
          {proposal.ui.content.length > 1 ? "s" : ""} below
        </div>
        <div className="mb-2 flex w-full max-w-full flex-col items-start md:flex-col ">
          <section className="w-full text-white">
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
              <span className="justify-self-end">Params/Tokens</span>
            </div>
            <div className="mt-2 space-y-4 font-light lg:space-y-2">
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
            <ul className="mt-4 list-disc space-y-2 text-xs font-light leading-3 text-yellow-500">
              {isSignOrResolve &&
                !!rows.find(
                  v =>
                    v.type === "UpdateProposalDuration" &&
                    Number(v.rawParams) < PROPOSAL_DURATION_WARNING
                ) && (
                  <li className="mt-1">
                    The proposal duration is short, which may limit your ability
                    to execute proposals once they have been executed
                  </li>
                )}
              {isSignOrResolve &&
                !!rows.find(
                  v =>
                    v.type === "RemoveSigner" &&
                    !!state.address &&
                    !!v.addresses &&
                    v.addresses.includes(state.address)
                ) && (
                  <li className="mt-1">
                    Your ownership will be revoked, resulting in your removal
                    from the list of owners
                  </li>
                )}
              {isSignOrResolve &&
                !!proposal.ui.content.find(
                  v =>
                    "addOwners" in v ||
                    "removeOwners" in v ||
                    "changeThreshold" in v ||
                    "adjustEffectivePeriod" in v
                ) && (
                  <li className="mt-1">
                    This proposal will update the settings for all the active
                    proposals.
                  </li>
                )}
              {isSignOrResolve &&
                !!rows.find(v => v.type === "ExecuteLambda") && (
                  <li className="mt-1">
                    {`We strongly advise that refrain from signing this proposal
                  unless you have a complete understanding of the potential
                  consequences. Please be aware that the "Note" may not
                  accurately reflect the actual behavior of the "Execute Lambda"
                  function. It is crucial to verify the behavior on the
                  "Param/Token."`}
                  </li>
                )}
            </ul>
          </section>
          <p className="mt-8 text-lg font-medium text-white">
            Action:{" "}
            {typeof modalState === "boolean"
              ? modalState
                ? "Sign"
                : "Reject"
              : `Resolve${
                  isExecutable
                    ? " (Approve)"
                    : isRejectable
                    ? " (Reject)"
                    : " (Expired)"
                }`}
          </p>
        </div>
        {typeof modalState != "undefined" &&
          (modalState === false && threshold !== 1
            ? proposal.ui.signatures.length + 1 > threshold
            : proposal.ui.signatures.length + 1 >= threshold && (
                <div className="mb-2 flex w-full items-center space-x-4">
                  <label className="font-medium text-white">
                    Try to resolve immediately:
                  </label>
                  <Field
                    name="flag"
                    type="checkbox"
                    className="h-4 w-4 rounded-md p-2"
                  />
                </div>
              ))}
        <ErrorMessage name="flag" />
        <div className="flex w-2/3 justify-between md:w-1/3">
          <button
            className="my-2 rounded border-2 bg-transparent p-2 font-medium text-white hover:outline-none"
            onClick={e => {
              e.preventDefault();
              closeModal(false);
            }}
          >
            Cancel
          </button>
          <button
            className="hover:border-offset-2 hover:border-offset-gray-800 my-2 rounded bg-primary p-2 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500"
            type="submit"
          >
            Confirm
          </button>
        </div>
      </Form>
    </Formik>
  );
}

export default ProposalSignForm;
