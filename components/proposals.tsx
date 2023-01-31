import { FC, useContext, useState } from "react";
import { AppStateContext, tezosState, contractStorage } from "../context/state";
import { proposal, proposalContent, status } from "../types/display";
import { signers, VersionedApi } from "../versioned/apis";
import ContractLoader from "./contractLoader";
function getClass(x: number, active: number): string {
    return x == active
        ? "inline-block p-4 w-full md:w-full text-left md:text-center break-normal rounded-t-lg border-b-2  text-md md:text-2xl uppercase border-primary text-white"
        : "inline-block p-4 w-full md:w-full text-left md:text-center text-md md:text-2xl uppercase rounded-t-lg border-b-2 border-gray-100 hover:text-gray-600 hover:border-primary text-white ";
}
const Proposals: FC<{
    proposals: [number, { og: any, ui: proposal }][], address: string, contract:
    contractStorage;

}> = ({ proposals, address, contract }) => {
    let [currentTab, setCurrentTab] = useState(0);
    let state = useContext(AppStateContext)!

    return (
        <div className="col-span-1 md:col-span-2" >
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
                    {proposals && proposals.length > 0 && [...proposals.filter(([_, proposal]) => "Proposing" === proposal.ui.status)].sort((a, b) => b[0] - a[0]).map(x => {
                        return <Card contract={contract} id={x[0]} key={JSON.stringify(x[1])} prop={x[1]} address={address} signable={!!state.address && !!!x[1].ui.signatures.find(x => x.signer == state.address) && true} />
                    }
                    )}
                </ul>
                <ul
                    className={(currentTab === 1 ? " " : " hidden") + ` p-1  rounded-lg  grid gap-2`}
                    id="profile"
                    role="tabpanel"
                    aria-labelledby="profile-tab"
                >
                    {proposals && proposals.length > 0 && [...proposals.filter(([_, proposal]) => !("Proposing" === proposal.ui.status))].sort((a, b) => b[0] - a[0]).map(x => {
                        return <Card contract={contract} id={x[0]} key={x[0]} prop={x[1]} address={address} signable={false} />
                    }
                    )}
                </ul>

            </div>
        </div >
    );
};
function getState(t: proposal): status {
    return t.status
}
const Card: FC<{ prop: { og: any, ui: proposal }, address: string, id: number, signable: boolean, contract: contractStorage }> = ({ contract, prop, address, id, signable }) => {
    let state = useContext(AppStateContext)!
    let [loading, setLoading] = useState(false)
    async function sign(proposal: number, prop: any, flag: boolean) {
        setLoading(true)
        try {
            let cc = await state.connection.contract.at(address);
            let versioned = VersionedApi(contract.version, address)
            await versioned.signProposal(cc, state.connection, proposal, prop, flag)
        } catch (e) {
            alert("failed to sign proposal")
        }
        setLoading(false)
    }

    return (
        <li className="border-2 border-white p-2">
            <div>
                <p className="md:inline-block text-white font-bold">Status: </p>
                <p className="md:inline-block text-white font-bold text-sm md:text-md">{getState(prop.ui)}</p>
            </div>
            <div>
                <p className="md:inline-block text-white font-bold">Proposed by: </p>
                <p className="md:inline-block text-white font-bold text-sm md:text-md">{state.aliases[prop.ui.author] || prop.ui.author}</p>
            </div>

            {("Executed" === prop.ui.status || "Rejected" === prop.ui.status) &&
                <div>
                    <p className="md:inline-block text-white font-bold">Signed By: </p>
                    <p className="md:inline-block text-white font-bold text-sm md:text-md">[ {[...prop.ui.signatures.keys()].join(", ")} ]</p>

                </div>
            }
            {
                "Proposing" === prop.ui.status && <div>
                    <p className="md:inline-block text-white font-bold">Waiting for signatures from: </p>
                    <p className="md:inline-block text-white font-bold text-sm md:text-md">[ {signers(contract).filter(x => !!!prop.ui.signatures.find((p) => x === p.signer)).map(x => state.aliases[x] || x).join(", ")} ] </p>
                </div>
            }
            <div>
                <p className="md:inline-block text-white font-bold">Transactions: </p>
                <p className="md:inline-block text-white font-bold text-sm md:text-md">[ {prop.ui.content.map(x => `${renderContent(x, state, address, contract)}`).join(", ")} ] </p>
            </div>
            <div className="flex flex-col md:flex-row mt-4">
                <ContractLoader loading={loading}>
                    {
                        state.address && signers(contract).includes(state.address) && signable && <button
                            type="button"
                            className={"mx-auto w-full  md:w-1/3 bg-primary font-medium text-white p-1.5 md:self-end self-center justify-self-end block md:mx-auto mx-none hover:bg-red-500 focus:bg-red-500 hover:outline-none border-2 hover:border-gray-100  hover:border-offset-2  hover:border-offset-gray-100"}
                            onClick={async (e) => {
                                e.preventDefault();
                                await sign(id, prop.og, false)
                            }}
                        >
                            Reject
                        </button>
                    }
                    {
                        state.address && signers(contract).includes(state.address) && signable && <button
                            type="button"
                            className={"mx-auto w-full  md:w-1/3 bg-primary font-medium text-white p-1.5 md:self-end self-center justify-self-end block md:mx-auto mx-none hover:bg-red-500 focus:bg-red-500 hover:outline-none border-2 hover:border-gray-100  hover:border-offset-2  hover:border-offset-gray-100"}
                            onClick={async (e) => {
                                e.preventDefault();
                                await sign(id, prop.og, true)
                            }}
                        >
                            Sign
                        </button>
                    }
                    {state.address && signers(contract).includes(state.address) && !signable && ("Proposing" === prop.ui.status) && (
                        <p className="mx-auto w-full  md:w-1/3 bg-primary font-medium text-white p-1.5 md:self-end self-center justify-self-end block md:mx-auto mx-none border-2">
                            Waiting for signatures of other owners
                        </p>
                    )}
                </ContractLoader>
            </div>
        </li >
    )
}

function renderContent(x: proposalContent, state: tezosState, address: string, contract: contractStorage): string {
    if ("transfer" in x) {
        return `${x.transfer.amount} mutez to ${state.aliases[x.transfer.destination] || x.transfer.destination}`
    }
    if ("executeLambda" in x) {
        return `Execute Lambda(${x.executeLambda.metadata})`
    }
    if ("addOwners" in x) {
        return `Add [${x.addOwners.join(', ')}] to validators`
    }
    if ("removeOwners" in x) {
        return `Remove [${x.removeOwners.join(', ')}] from validators`
    }
    if ("changeThreshold" in x) {
        return `Change threshold from ${contract.threshold} to ${x.changeThreshold}`
    }
    return "Not supported"
}
export default Proposals;
