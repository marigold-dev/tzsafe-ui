import Link from "next/link";
import { useContext } from "react";
import Footer from "../components/footer";
import Meta from "../components/meta";
import NavBar from "../components/navbar";
import { AppDispatchContext, AppStateContext } from "../context/state";

function Home() {
    let state = useContext(AppStateContext)!
    let dispatch = useContext(AppDispatchContext)!;
    return (
        <div className="relative h-full min-h-screen flex flex-col overflow-y-auto">
            <Meta title={"Wallets"} />
            <NavBar />
            <div className="bg-graybg shadow">
                <div className="mx-auto  max-w-7xl py-6 px-4 sm:px-6 lg:px-8 flex justify-start">
                    <h1 className="text-white text-2xl font-extrabold">
                        Imported wallets
                    </h1>
                </div>
            </div>
            <main className="bg-gray-100 h-full grow">
                <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
                    <div className="px-4 py-6 sm:px-0">
                        <div className="md:h-96 min-h-fit border-4 border-dashed border-white grid-rows-auto md:grid-cols-auto md:auto-rows-max grid p-2 overflow-y-auto">
                            {state?.contracts && Object.entries(state!.contracts).map(([address, _contract]) => {
                                return (
                                    <Link
                                        key={address}
                                        className=" flex md:flex-row flex-col justify-between bg-primary font-medium text-white my-2 p-2 hover:bg-red-500 focus:bg-red-500 hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                                        href={`/wallets/${address}`}
                                    >
                                        {state.aliases[address] ?
                                            <div>
                                                <p className="text-xs md:text-xl">
                                                    {state.aliases[address]} {state.contracts[address].version || "Unknown version"}
                                                </p>
                                                <p className="text-xs md:text-xl">
                                                    {address}
                                                </p>
                                            </div>
                                            : <p className="text-xs md:text-xl">
                                                {address} {state.contracts[address].version || "Unknown version"}
                                            </p>
                                        }
                                        <button
                                            className="bg-dark hover:bg-neutral-800  font-medium text-white my-2 p-2 md:text-xl text-s hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                                            onClick={e => {
                                                e.preventDefault();
                                                dispatch!({ type: "removeContract", address: address })
                                            }}
                                        >
                                            Remove wallet
                                        </button>
                                    </Link>)
                            })}
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}



export default Home;
