import Link from "next/link";
import { useContext } from "react";
import Meta from "../components/meta";
import NavBar from "../components/navbar";
import { AppStateContext } from "../context/state";

function Home() {
    let state = useContext(AppStateContext)!
    return (
        <div>
            <Meta title={"wallet Page"} />

            <NavBar />

            <div className="bg-white shadow">
                <div className="mx-auto  max-w-7xl py-6 px-4 sm:px-6 lg:px-8 flex justify-start">
                    <h1 className="text-black text-3xl font-extrabold">
                        Imported wallets
                    </h1>
                </div>
            </div>
            <main className="min-h-full bg-gray-100">
                <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
                    <div className="px-4 py-6 sm:px-0">
                        <div className="md:h-96 min-h-fit border-4 border-dashed border-white grid-rows-auto md:grid-cols-auto md:grid-rows-auto grid p-2">
                            {state?.contracts && Object.entries(state!.contracts).map(([address, contract]) => {
                                return (
                                    <Link
                                        key={address}
                                        className="rounded-md bg-indigo-500 font-medium text-white my-2 p-2 hover:bg-indigo-600 focus:bg-indigo-600 hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                                        href={`/contracts/${address}`}
                                    >
                                        {state.aliases[address] ? <div>
                                            <p className="text-xs md:text-xl">
                                                {state.aliases[address]}
                                            </p>
                                            <p className="text-xs md:text-xl">
                                                {address}
                                            </p>
                                        </div>
                                            : <p className="text-xs md:text-xl">
                                                {address}
                                            </p>}
                                    </Link>)
                            })}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}



export default Home;
