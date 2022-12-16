import Link from "next/link";
import { useContext } from "react";
import Footer from "../components/footer";
import Meta from "../components/meta";
import NavBar from "../components/navbar";
import { AppStateContext } from "../context/state";

function Home() {
    let state = useContext(AppStateContext)!
    return (
        <div className="relative h-full min-h-screen">
            <Meta title={"wallet Page"} />

            <NavBar />

            <div className="bg-graybg shadow">
                <div className="mx-auto  max-w-7xl py-6 px-4 sm:px-6 lg:px-8 flex justify-start">
                    <h1 className="text-white text-2xl font-extrabold">
                        Imported wallets
                    </h1>
                </div>
            </div>
            <main className="min-h-full bg-gray-100">
                <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
                    <div className="px-4 py-6 sm:px-0">
                        <div className="md:h-96 min-h-fit border-4 border-dashed border-white grid-rows-auto md:grid-cols-auto md:auto-rows-max grid p-2">
                            {state?.contracts && Object.entries(state!.contracts).map(([address, _contract]) => {
                                return (
                                    <Link
                                        key={address}
                                        className="bg-primary font-medium text-white my-2 p-2 hover:bg-red-500 focus:bg-red-500 hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
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
            <Footer />
        </div>
    );
}



export default Home;
