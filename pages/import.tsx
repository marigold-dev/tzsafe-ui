import Link from "next/link";
import React from "react";
import Meta from "../components/meta";
import NavBar from "../components/navbar";

function Home() {

    return (
        <div>

            <Meta title={"import wallet"} />

            <NavBar >{/* <LinkComponent text="Dash" path={"/dash"} /> */}</NavBar>
            <div className="bg-white shadow">
                <div className="mx-auto  max-w-7xl py-6 px-4 sm:px-6 lg:px-8 flex justify-start">
                    <h1 className="text-black text-3xl font-extrabold">
                        Welcome to Multisig
                    </h1>
                </div>
            </div>
            <main className="min-h-full bg-gray-100">
                <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
                    <div className="px-4 py-6 sm:px-0">
                        <div className="md:h-96 min-h-fit rounded-lg border-4 border-dashed border-gray-200 grid-rows-2 md:grid-cols-2 md:grid-rows-1 grid p-2">
                            <div className="bg-gray-300 min-h-max  p-4 rounded-t-md md:rounded-l-md  md:rounded-tr-none grid grid-rows-5">
                                <div className="row-span-6">
                                    <h2 className="text-gray-700 md:text-2xl text-xl font-extrabold">
                                        Create new Multisig wallet
                                    </h2>
                                    <p className="md:my-6 my-2 text-gray-700 md:text-l text-s font-extrabold md:w-3/4 break-words">
                                        Create a new Multisig wallet that is controlled by one or
                                        multiple signers.
                                    </p>
                                </div>
                                <Link
                                    type="button"
                                    href={{ pathname: "/create" }}
                                    className={
                                        " justify-self-end w-1/2 text-center row-span-1 max-w-xs text-md md:text-2xl items-center rounded-md py-2 px-2 md:py-1 font-bold md:px-2 bg-indigo-800 border-gray-800 hover:bg-indigo-600 focus:bg-indigo-600 hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                                    }
                                    id="user-menu-button"
                                    aria-expanded="false"
                                    aria-haspopup="true"
                                >
                                    Create
                                </Link>
                            </div>
                            <div className="bg-gray-300 min-h-max  p-4 rounded-b-md md:rounded-r-md  md:rounded-bl-none grid grid-rows-5">
                                <div className="row-span-6">
                                    <h2 className="text-gray-700 md:text-2xl text-xl font-extrabold">
                                        Import existing Multisig
                                    </h2>
                                    <p className="md:my-6 my-2 text-gray-700 md:text-l text-s font-extrabold md:w-3/4 break-words">
                                        Already have a Multisig wallet or want to access it from a different device? Load it using its address
                                    </p>
                                </div>
                                <Link
                                    type="button"
                                    href={{ pathname: "/load" }}
                                    className={
                                        " justify-self-end w-1/2 text-center row-span-1 max-w-xs text-md md:text-2xl items-center rounded-md py-2 px-2 md:py-1 md:px-2 font-bold text-gray-800 bg-gray-200 border-gray-800 hover:bg-gray-300 focus:bg-gray-300 hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                                    }
                                    id="user-menu-button"
                                    aria-expanded="false"
                                    aria-haspopup="true"
                                >
                                    Import
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Home;
