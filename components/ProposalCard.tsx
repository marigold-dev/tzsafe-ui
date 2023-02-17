import { FC, useContext, useState } from "react";
import { AppStateContext, contractStorage, tezosState } from "../context/state";
import { proposal, proposalContent, status } from "../types/display";
import { adaptiveTime, countdown } from "../utils/adaptiveTime";
import { signers } from "../versioned/apis";
import ContractLoader from "./contractLoader";

function renderContent(
  x: proposalContent,
  state: tezosState,
  address: string,
  contract: contractStorage
): string {
  if ("transfer" in x) {
    return `${x.transfer.amount} mutez to ${
      state.aliases[x.transfer.destination] || x.transfer.destination
    }`;
  }
  if ("executeLambda" in x) {
    return `Execute Lambda(${x.executeLambda.metadata})`;
  }
  if ("execute" in x) {
    return `Execute (${x.execute})`;
  }
  if ("adjustEffectivePeriod" in x) {
    return `Adjust effective period:  (${adaptiveTime(
      x.adjustEffectivePeriod.toString()
    )})`;
  }
  if ("addOwners" in x) {
    return `Add [${x.addOwners.join(", ")}] to validators`;
  }
  if ("removeOwners" in x) {
    return `Remove [${x.removeOwners.join(", ")}] from validators`;
  }
  if ("changeThreshold" in x) {
    return `Change threshold from ${contract.threshold} to ${x.changeThreshold}`;
  }
  let _: never = x;
  return "Not supported";
}

function getState(t: proposal): status {
  return t.status;
}

const Card: FC<{
  prop: { og: any; ui: proposal };
  address: string;
  id: number;
  signable: boolean;
  contract: contractStorage;
  setCloseModal?: (arg: boolean | undefined) => void;
}> = ({ contract, prop, address, id, signable, setCloseModal = () => {} }) => {
  let state = useContext(AppStateContext)!;
  let [loading, setLoading] = useState(false);
  function resolvable(
    signatures: { signer: string; result: boolean }[]
  ): boolean {
    let pro = signatures.filter(x => x.result).length >= contract.threshold;
    let against = signatures.filter(x => !x.result).length > contract.threshold;
    return pro || against;
  }
  return (
    <div className="rounded bg-zinc-800 px-6 py-4">
      <div>
        <p className="font-bold text-white md:inline-block">Status: </p>
        <p className="md:text-md text-sm font-bold text-white md:inline-block">
          {getState(prop.ui)}
        </p>
      </div>
      {"effective_period" in contract && (
        <div>
          <p className="font-bold text-white md:inline-block">Expires in: </p>
          <p className="md:text-md text-sm font-bold text-white md:inline-block">
            {countdown(contract.effective_period, prop.ui.timestamp)}
          </p>
        </div>
      )}
      <div>
        <p className="font-bold text-white md:inline-block">Proposed by: </p>
        <p className="md:text-md text-sm font-bold text-white md:inline-block">
          {state.aliases[prop.ui.author] || prop.ui.author}
        </p>
      </div>

      {("Executed" === prop.ui.status || "Rejected" === prop.ui.status) && (
        <div>
          <p className="font-bold text-white md:inline-block">Signed By: </p>
          <p className="md:text-md text-sm font-bold text-white md:inline-block">
            [ {[...prop.ui.signatures.keys()].join(", ")} ]
          </p>
        </div>
      )}
      {"Proposing" === prop.ui.status && (
        <div>
          <p className="font-bold text-white md:inline-block">
            Waiting for signatures from:{" "}
          </p>
          <p className="md:text-md text-sm font-bold text-white md:inline-block">
            [
            {signers(contract)
              .filter(x => !!!prop.ui.signatures.find(p => x === p.signer))
              .map(x => state.aliases[x] || x)
              .join(", ")}{" "}
            ]
          </p>
        </div>
      )}
      <div>
        <p className="font-bold text-white md:inline-block">Transactions: </p>
        <p className="md:text-md text-sm font-bold text-white md:inline-block">
          [
          {prop.ui.content
            .map(x => `${renderContent(x, state, address, contract)}`)
            .join(", ")}{" "}
          ]
        </p>
      </div>
      <div className="mt-4 flex flex-col md:flex-row">
        <ContractLoader loading={loading}>
          {state.address &&
            signers(contract).includes(state.address) &&
            signable && (
              <button
                type="button"
                className={
                  "mx-none mx-auto block w-full self-center justify-self-end rounded bg-primary p-1.5 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500 md:mx-auto md:w-1/3 md:self-end"
                }
                onClick={async e => {
                  e.preventDefault();
                  setCloseModal(false);
                }}
              >
                Reject
              </button>
            )}
          {state.address &&
            signers(contract).includes(state.address) &&
            resolvable(prop.ui.signatures) &&
            "Executed" !== prop.ui.status && (
              <button
                type="button"
                className={
                  "mx-none mx-auto block w-full self-center justify-self-end bg-primary p-1.5 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500 md:mx-auto md:w-1/3 md:self-end"
                }
                onClick={async e => {
                  e.preventDefault();
                  setCloseModal(undefined);
                }}
              >
                Resolve
              </button>
            )}
          {state.address &&
            signers(contract).includes(state.address) &&
            signable && (
              <button
                type="button"
                className={
                  "mx-none mx-auto block w-full self-center justify-self-end rounded bg-primary p-1.5 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500 md:mx-auto md:w-1/3 md:self-end"
                }
                onClick={async e => {
                  e.preventDefault();
                  setCloseModal(true);
                }}
              >
                Sign
              </button>
            )}
          {state.address &&
            signers(contract).includes(state.address) &&
            !resolvable(prop.ui.signatures) &&
            !signable &&
            "Proposing" === prop.ui.status && (
              <p className="mx-none mx-auto  block w-full self-center justify-self-end bg-primary p-1.5 font-medium text-white md:mx-auto md:w-1/3 md:self-end">
                Waiting for signatures of other owners
              </p>
            )}
        </ContractLoader>
      </div>
    </div>
  );
};

export default Card;
