import { stringify } from "querystring";
import { FC, useContext, useState } from "react";
import { AppStateContext, tezosState } from "../context/state";
import { content, proposal, viewProposal } from "../context/types";
function getClass(x: number, active: number): string {
    return x == active
        ? "inline-block p-4 md:w-full rounded-t-lg border-b-2  text-xl md:text-2xl uppercase border-primary text-white"
        : "inline-block p-4 md:w-full text-xl md:text-2xl uppercase rounded-t-lg border-b-2 border-gray-100 hover:text-gray-600 hover:border-primary text-white ";
}
const Proposals: FC<{ proposals: [number, viewProposal][], address: string }> = ({ proposals, address }) => {
    let [currentTab, setCurrentTab] = useState(0);
    let state = useContext(AppStateContext)!

    return (
        <div className="col-span-1 md:col-span-2">
            <h3 className="text-3xl font-bold text-white">Proposals</h3>
            <div className="mb-4 border-b border-gray-100 ">
                <ul
                    className="grid grid-flow-col -mb-px text-sm font-medium text-center"
                    id="myTab"
                    data-tabs-toggle="#myTabContent"
                    role="tablist"
                >
                    <li className="md:mr-2 md:w-full" role="presentation">
                        <button
                            className={getClass(0, currentTab)}
                            onClick={e => {
                                e.preventDefault()
                                currentTab !== 0 && setCurrentTab(0)
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
                                e.preventDefault()
                                currentTab !== 1 && setCurrentTab(1)
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
            <div className="h-96 md:h-96 overflow-y-auto">
                <ul
                    className={(currentTab === 0 ? " " : " hidden") + ` p-1  rounded-lg :bg-gray-800 grid gap-2 `}
                    id="profile"
                    role="tabpanel"
                    aria-labelledby="profile-tab"
                >
                    {proposals && proposals.length > 0 && [...proposals.filter(x => "active" in x[1].state)].sort((a, b) => b[0] - a[0]).map(x => {
                        return <Card id={x[0]} key={x[0]} prop={x[1]} address={address} signable={!!state.address && !x[1].signatures.has(state.address) && true} />
                    }
                    )}
                </ul>
                <ul
                    className={(currentTab === 1 ? " " : " hidden") + ` p-1  rounded-lg  grid gap-2`}
                    id="profile"
                    role="tabpanel"
                    aria-labelledby="profile-tab"
                >
                    {proposals && proposals.length > 0 && [...proposals.filter(x => !("active" in x[1].state))].sort((a, b) => b[0] - a[0]).map(x => {
                        return <Card id={x[0]} key={x[0]} prop={x[1]} address={address} signable={false} />
                    }
                    )}
                </ul>

            </div>
        </div >
    );
};
function getState(t: viewProposal): string {
    if ("active" in t.state) {
        return "Active"
    }
    if ("done" in t.state) {
        return "Executed"
    }
    if ("closed" in t.state) {
        return "Rejected"
    }
    return "Unknown"
}
const Card: FC<{ prop: viewProposal, address: string, id: number, signable: boolean }> = ({ prop, address, id, signable }) => {
    let state = useContext(AppStateContext)!
    async function sign(proposal: number, flag: boolean) {
        let cc = await state.connection.contract.at(address);
        let params = cc.methods
            .sign_and_execute_proposal(proposal, flag)
            .toTransferParams();
        let op = await state.connection.wallet.transfer(params).send();
        await op.confirmation(1);
    }
    return (
        <li className="border-2 border-white p-2">
            <div>
                <p className="md:inline-block text-white font-bold">Status: </p>
                <p className="md:inline-block text-white font-bold text-sm md:text-md">{getState(prop)}</p>
            </div>
            <div>
                <p className="md:inline-block text-white font-bold">Proposed by: </p>
                <p className="md:inline-block text-white font-bold text-sm md:text-md">{state.aliases[prop.proposer] || prop.proposer}</p>
            </div>
            {!("closed" in prop.state) &&
                <div>
                    <p className="md:inline-block text-white font-bold">Signatures: </p>
                    <p className="md:inline-block text-white font-bold text-sm md:text-md">{prop.signatures.size}/{state.contracts[address].signers.length}</p>
                </div>
            }
            {!("closed" in prop.state) &&
                <div>
                    <p className="md:inline-block text-white font-bold">Signed By: </p>
                    <p className="md:inline-block text-white font-bold text-sm md:text-md">[ {[...prop.signatures.keys()].join(", ")} ]</p>

                </div>
            }
            {
                "active" in prop.state && <div>
                    <p className="md:inline-block text-white font-bold">Waiting for signatures from: </p>
                    <p className="md:inline-block text-white font-bold text-sm md:text-md">[ {state.contracts[address].signers.filter(x => !prop.signatures.has(x)).map(x => state.aliases[x] || x).join(", ")} ] </p>
                </div>
            }
            <div>
                <p className="md:inline-block text-white font-bold">Transactions: </p>
                <p className="md:inline-block text-white font-bold text-sm md:text-md">[ {prop.content.map(x => `${renderContent(x, state, address)}`).join(", ")} ] </p>
            </div>
            <div className="flex flex-col md:flex-row mt-4">
                {
                    state.address && state.contracts[address].signers.includes(state.address) && signable && <button
                        type="button"
                        className={"mx-auto w-full  md:w-1/3 bg-primary font-medium text-white p-1.5 md:self-end self-center justify-self-end block md:mx-auto mx-none hover:bg-red-500 focus:bg-red-500 hover:outline-none border-2 hover:border-gray-100  hover:border-offset-2  hover:border-offset-gray-100"}
                        onClick={async (e) => {
                            e.preventDefault();
                            await sign(id, false)
                        }}
                    >
                        Reject
                    </button>
                }
                {
                    state.address && state.contracts[address].signers.includes(state.address) && signable && <button
                        type="button"
                        className={"mx-auto w-full  md:w-1/3 bg-primary font-medium text-white p-1.5 md:self-end self-center justify-self-end block md:mx-auto mx-none hover:bg-red-500 focus:bg-red-500 hover:outline-none border-2 hover:border-gray-100  hover:border-offset-2  hover:border-offset-gray-100"}
                        onClick={async (e) => {
                            e.preventDefault();
                            await sign(id, true)
                        }}
                    >
                        Sign
                    </button>
                }
                {state.address && state.contracts[address].signers.includes(state.address) && !signable && !prop.executed && (
                    <p className="mx-auto w-full  md:w-1/3 bg-primary font-medium text-white p-1.5 md:self-end self-center justify-self-end block md:mx-auto mx-none border-2">
                        Waiting for signatures of other owners
                    </p>
                )}
            </div>
        </li >
    )
}

function renderContent(x: content, state: tezosState, address: string): string {
    if ("transfer" in x) {
        return `${x.transfer.amount} XTZ to ${state.aliases[x.transfer.target] || x.transfer.target}`
    }
    if ("execute" in x) {
        return `${x.execute.amount} XTZ to ${state.aliases[x.execute.target] || x.execute.target} and pass parameter: Unit`
    }
    if ("add_signers" in x) {
        return `Add [${x.add_signers.join(', ')}] to validators`
    }
    if ("remove_signers" in x) {
        return `Remove [${x.remove_signers.join(', ')}] from validators`
    }
    if ("adjust_threshold" in x) {
        return `Change threshold from ${state.contracts[address].threshold} to ${x.adjust_threshold}`
    }
    return "Not supported"
}
export default Proposals;
