import { timeStamp } from "console";
import { FC, useContext, useState } from "react";
import { AppStateContext, tezosState, contractStorage } from "../context/state";
import {
  mutezTransfer,
  proposal,
  proposalContent,
  status,
} from "../types/display";
import { adaptiveTime, countdown } from "../utils/adaptiveTime";
import { signers, VersionedApi } from "../versioned/apis";
import ContractLoader from "./contractLoader";

function getClass(x: number, active: number): string {
  return x == active
    ? "inline-block p-4 w-full md:w-full text-left md:text-center break-normal rounded-t-lg border-b-2  text-md md:text-2xl uppercase border-primary text-white"
    : "inline-block p-4 w-full md:w-full text-left md:text-center text-md md:text-2xl uppercase rounded-t-lg border-b-2 border-gray-100 hover:text-gray-600 hover:border-primary text-white ";
}
const Proposals: FC<{
  proposals: [number, { og: any; ui: proposal }][];
  address: string;
  contract: contractStorage;
  transfers: mutezTransfer[];
  setCloseModal: (_: number, arg: boolean | undefined) => void;
}> = ({ proposals, address, contract, setCloseModal, transfers }) => {
  let [currentTab, setCurrentTab] = useState(0);
  let state = useContext(AppStateContext)!;

  return (
    <div className="col-span-1 md:col-span-2">
      <h3 className="text-3xl font-bold text-white">Proposals</h3>
      <div className="border-gray-100 mb-4 border-b ">
        <ul
          className="-mb-px grid grid-flow-col text-center text-sm font-medium"
          id="myTab"
          data-tabs-toggle="#myTabContent"
          role="tablist"
        >
          <li className="md:mr-2 md:w-full" role="presentation">
            <button
              className={getClass(0, currentTab)}
              onClick={e => {
                e.preventDefault();
                currentTab !== 0 && setCurrentTab(0);
              }}
              id="profile-tab"
              data-tabs-target="#profile"
              type="button"
              role="tab"
              aria-controls="profile"
              aria-selected="false"
            >
              Waiting for signatures
            </button>
          </li>
          <li className="md:mr-2 md:w-full " role="presentation">
            <button
              className={getClass(1, currentTab)}
              onClick={e => {
                e.preventDefault();
                currentTab !== 1 && setCurrentTab(1);
              }}
              id="dashboard-tab"
              data-tabs-target="#dashboard"
              type="button"
              role="tab"
              aria-controls="dashboard"
              aria-selected="false"
            >
              History
            </button>
          </li>
        </ul>
      </div>
      <div className="h-full">
        <ul
          className={
            (currentTab === 0 ? " " : " hidden") +
            ` :bg-gray-800  grid grid-cols-1 gap-2 break-words rounded-lg p-1 `
          }
          id="profile"
          role="tabpanel"
          aria-labelledby="profile-tab"
        >
          {proposals &&
            proposals.length > 0 &&
            [
              ...proposals.filter(
                ([_, proposal]) => "Proposing" === proposal.ui.status
              ),
            ]
              .sort((a, b) => b[0] - a[0])
              .map(x => {
                return (
                  <Card
                    contract={contract}
                    id={x[0]}
                    setCloseModal={(arg: boolean | undefined) =>
                      setCloseModal(x[0], arg)
                    }
                    key={JSON.stringify(x[1])}
                    prop={x[1]}
                    address={address}
                    signable={
                      !!state.address &&
                      !!!x[1].ui.signatures.find(
                        x => x.signer == state.address
                      ) &&
                      true
                    }
                  />
                );
              })}
        </ul>
        <ul
          className={
            (currentTab === 1 ? " " : " hidden") +
            ` grid  grid-cols-1  gap-2 break-words rounded-lg p-1`
          }
          id="profile"
          role="tabpanel"
          aria-labelledby="profile-tab"
        >
          {proposals &&
            proposals.length > 0 &&
            [
              ...proposals.filter(
                ([_, proposal]) => !("Proposing" === proposal.ui.status)
              ),
            ]
              .concat(
                transfers.map(
                  x => [-1, { ui: { timestamp: x.timestamp }, ...x }] as any
                )
              )
              .sort(
                (a, b) =>
                  Number(Date.parse(b[1].ui.timestamp).toString(10)) -
                  Number(Date.parse(a[1].ui.timestamp).toString(10))
              )
              .map(x => {
                return x[0] == -1 ? (
                  <Transfer
                    address={address}
                    key={(x[1] as any).timestamp as any}
                    prop={x[1] as any}
                  />
                ) : (
                  <Card
                    contract={contract}
                    id={x[0]}
                    key={x[0]}
                    prop={x[1]}
                    address={address}
                    signable={false}
                  />
                );
              })}
        </ul>
      </div>
    </div>
  );
};
const Transfer: FC<{
  prop: mutezTransfer;
  address: string;
}> = ({ prop, address }) => {
  let state = useContext(AppStateContext)!;
  return (
    <li className="border-2 border-white p-2">
      <div>
        <p className="font-bold text-white md:inline-block">
          Transaction: received Mutez{" "}
        </p>
      </div>
      <div>
        <p className="font-bold text-white md:inline-block">Sender: </p>
        <p className="md:text-md text-sm font-bold text-white md:inline-block">
          {state.aliases[prop.sender.address] || prop.sender.address}
        </p>
      </div>
      {prop.initiator && (
        <div>
          <p className="font-bold text-white md:inline-block">Initiator: </p>
          <p className="md:text-md text-sm font-bold text-white md:inline-block">
            {state.aliases[prop.initiator.address] || prop.initiator.address}
          </p>
        </div>
      )}
      <div>
        <p className="font-bold text-white md:inline-block">Target: </p>
        <p className="md:text-md text-sm font-bold text-white md:inline-block">
          {state.aliases[address] || address}
        </p>
      </div>
      <div>
        <p className="font-bold text-white md:inline-block">Amount(Mutez): </p>
        <p className="md:text-md text-sm font-bold text-white md:inline-block">
          {prop.amount}
        </p>
      </div>
      <div>
        <p className="font-bold text-white md:inline-block">Timestamp: </p>
        <p className="md:text-md text-sm font-bold text-white md:inline-block">
          {prop.timestamp}
        </p>
      </div>
    </li>
  );
};
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
    <li className="border-2 border-white p-2">
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
                  "mx-none hover:border-gray-100  hover:border-offset-2 hover:border-offset-gray-100 mx-auto block w-full self-center justify-self-end border-2 bg-primary p-1.5 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500 md:mx-auto  md:w-1/3  md:self-end"
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
                  "mx-none hover:border-gray-100  hover:border-offset-2 hover:border-offset-gray-100 mx-auto block w-full self-center justify-self-end border-2 bg-primary p-1.5 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500 md:mx-auto  md:w-1/3  md:self-end"
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
                  "mx-none hover:border-gray-100  hover:border-offset-2 hover:border-offset-gray-100 mx-auto block w-full self-center justify-self-end border-2 bg-primary p-1.5 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500 md:mx-auto  md:w-1/3  md:self-end"
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
              <p className="mx-none mx-auto  block w-full self-center justify-self-end border-2 bg-primary p-1.5 font-medium text-white md:mx-auto md:w-1/3 md:self-end">
                Waiting for signatures of other owners
              </p>
            )}
        </ContractLoader>
      </div>
    </li>
  );
};

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
export default Proposals;
