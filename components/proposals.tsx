import { FC, useContext, useState } from "react";
import { AppStateContext } from "../context/state";
import { proposal } from "../context/types";
function getClass(x: number, active: number): string {
    return x == active
        ? "inline-block p-4 md:w-full rounded-t-lg border-b-2 text-gray-800 text-xl md:text-2xl uppercase border-indigo-600"
        : "inline-block p-4 md:w-full text-gray-800 text-xl md:text-2xl uppercase rounded-t-lg border-b-2 border-transparent hover:text-gray-600 hover:border-indigo-600 ";
}
const Proposals: FC<{ proposals: [number, proposal][], address: string }> = ({ proposals, address }) => {
    let [currentTab, setCurrentTab] = useState(0);
    return (
        <div className="col-span-1 md:col-span-2">
            <h3 className="text-3xl font-bold text-gray-800">Proposals</h3>
            <div className="mb-4 border-b border-gray-600 ">
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
                            Pending
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
                            Executed
                        </button>
                    </li>
                </ul>
            </div>
            <div className="md:h-96 overflow-x-auto">
                <ul
                    className={(currentTab === 0 ? " " : " hidden") + ` p-1  rounded-lg :bg-gray-800 grid gap-2 `}
                    id="profile"
                    role="tabpanel"
                    aria-labelledby="profile-tab"
                >
                    {proposals && proposals.length > 0 && [...proposals.filter(x => !x[1].executed)].sort((a, b) => b[0] - a[0]).map(x => {
                        return <Card id={x[0]} key={x[0]} prop={x[1]} address={address} />
                    }
                    )}
                </ul>
                <ul
                    className={(currentTab === 1 ? " " : " hidden") + ` p-1  rounded-lg  grid gap-2`}
                    id="profile"
                    role="tabpanel"
                    aria-labelledby="profile-tab"
                >
                    {proposals && proposals.length > 0 && [...proposals.filter(x => x[1].executed)].sort((a, b) => b[0] - a[0]).map(x => {
                        return <Card id={x[0]} key={x[0]} prop={x[1]} address={address} />
                    }
                    )}
                </ul>

            </div>
        </div >
    );
};
const Card: FC<{ prop: proposal, address: string, id: number }> = ({ prop, address, id }) => {
    let state = useContext(AppStateContext)!
    async function sign(proposal: number) {
        let cc = await state.connection.contract.at(address);
        let params = cc.methods
            .sign_proposal(proposal)
            .toTransferParams();
        let op = await state.connection.wallet.transfer(params).send();
        await op.confirmation(1);
    }
    return (
        <li className="border-2 border-gray-800 rounded-md p-2">
            <div>
                <p className="md:inline-block text-gray-800 font-bold">Proposed by: </p>
                <p className="md:inline-block text-gray-800 font-bold text-sm md:text-md">{state.aliases[prop.proposer] || prop.proposer}</p>
            </div>
            <div>
                <p className="md:inline-block text-gray-800 font-bold">Signatures: </p>
                <p className="md:inline-block text-gray-800 font-bold text-sm md:text-md">{prop.approved_signers.length}/{state.contracts[address].signers.length}</p>
            </div>
            <div>
                <p className="md:inline-block text-gray-800 font-bold">Signed By: </p>
                <p className="md:inline-block text-gray-800 font-bold text-sm md:text-md">[ {prop.approved_signers.join(", ")} ]</p>

            </div>
            <div>
                <p className="md:inline-block text-gray-800 font-bold">Waiting for signatures from: </p>
                <p className="md:inline-block text-gray-800 font-bold text-sm md:text-md">[ {state.contracts[address].signers.filter(x => !prop.approved_signers.includes(x)).map(x => state.aliases[x] || x).join(", ")} ] </p>
            </div>
            <div>
                <p className="md:inline-block text-gray-800 font-bold">Transactions: </p>
                <p className="md:inline-block text-gray-800 font-bold text-sm md:text-md">[ {prop.content.map((x: any) => `${x.transfer.amount} XTZ to ${state.aliases[x.transfer.target] || x.transfer.target}`)} ] </p>
            </div>
            {
                state.address && state.contracts[address].signers.includes(state.address) && <button
                    type="button"
                    className={"mx-auto w-full  md:w-1/3 rounded-md bg-indigo-500 font-medium text-white p-1.5 md:self-end self-center justify-self-end block md:mx-auto mx-none hover:bg-indigo-600 focus:bg-indigo-600 hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"}
                    onClick={async (e) => {
                        e.preventDefault();
                        await sign(id)
                    }}
                >
                    Sign
                </button>
            }
            {/* <p className="text-gray-800 font-Bold">{JSON.stringify(prop)}</p> */}
        </li>
    )
}
export default Proposals;
