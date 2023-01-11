
import Link from "next/link";
import React, {
    useContext,
    useState
} from "react";
import { AppDispatchContext, AppStateContext } from "../context/state";
import LinkComponent from "./links";
import LoginButton from "./loginButton";

let RenderContracts = () => {
    const state = useContext(AppStateContext);
    return (state && state?.contracts && Object.keys(state.contracts).length > 0 ? (<LinkComponent path="/wallets" text={"Wallets"} />) : null);
}

const NavBar = (_: React.PropsWithChildren) => {
    let [menuOpen, setMenuOpen] = useState(false);
    let [loginOpen, setLoginOpen] = useState(false);

    const state = useContext(AppStateContext);
    const dispatch = useContext(AppDispatchContext);
    const disconnectWallet = async (): Promise<void> => {
        if (state?.beaconWallet) {
            await state.beaconWallet.clearActiveAccount();
        }
        dispatch!({ type: "logout" });
    };
    return (
        <div className="">
            <nav className="border-b-4 border-gray">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Link href={"/"} className="text-xl font-bold tracking-wider text-white">
                                    <span>MULTISIG</span>
                                    <span className="text-xs ml-4">BETA</span>
                                </Link>
                            </div>
                            <div className="hidden md:block">
                                <div className="ml-10 flex items-baseline space-x-4">
                                    <RenderContracts />
                                    {/* <!-- Current: "bg-gray-900 text-white", Default: "text-gray-300 hover:bg-gray-700 hover:text-white" --> */}
                                </div>
                            </div>
                        </div>
                        <div className="hidden md:block">
                            <div className="ml-4 flex items-center md:ml-6">
                                <button
                                    onClick={() => console.log("todo")}
                                    type="button"
                                    className="hidden rounded-full bg-gray-800 p-1 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
                                >
                                    <span className="sr-only">View notifications</span>
                                    {/*<!-- Heroicon name: outline/bell --> */}
                                    <svg
                                        className="h-6 w-6"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth="1.5"
                                        stroke="currentColor"
                                        aria-hidden="true"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                                        />
                                    </svg>
                                </button>

                                {state?.address == null ? (
                                    <div className="relative ml-3">
                                        <LoginButton />
                                    </div>
                                ) : (
                                    <div className="relative ml-3 group ">
                                        <div className="flex items-end">
                                            <button
                                                type="button"
                                                className=" max-w-xs items-center  py-1 px-2 bg-gray-800 text-sm focus:outline-none focus:border-2 focus:border-white focus:border-offset-2 focus:border-offset-gray-800"
                                                id="user-menu-button"
                                                aria-expanded="false"
                                                aria-haspopup="true"
                                            >
                                                <span className="sr-only">Open user menu</span>
                                                <div className="flex flex-col items-center">
                                                    <span className="block font-md font-bold text-center text-white">
                                                        {state?.address.slice(0, 3) +
                                                            "..." +
                                                            state?.address.slice(33)}
                                                    </span>
                                                    <span className="block font-xs text-white">
                                                        Ghostnet
                                                    </span>
                                                </div>
                                            </button>
                                        </div>
                                        <div
                                            className={`absolute right-0 z-10 mt-2 w-48 origin-top-right  bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5  hidden group-focus-within:block  group-focus-within:outline-none `}
                                            role="menu"
                                            aria-orientation="vertical"
                                            aria-labelledby="user-menu-button"
                                        >
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    disconnectWallet();
                                                }}
                                                className="block px-4 py-2 text-md text-dark"
                                                role="menuitem"
                                                id="user-menu-item-2"
                                            >
                                                Sign out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        {state && state.contracts && (<div className={`-mr-2  flex md:hidden`}>
                            <button
                                type="button"
                                onClick={() => {
                                    menuOpen ? setMenuOpen(false) : setMenuOpen(true);
                                }}
                                className="inline-flex items-center justify-center rounded-md bg-gray-800 p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
                                aria-controls="mobile-menu"
                                aria-expanded="false"
                            >
                                <span className="sr-only">Open main menu</span>
                                <svg
                                    className="block h-6 w-6"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.5"
                                    stroke="currentColor"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                                    />
                                </svg>
                                <svg
                                    className="hidden h-6 w-6"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.5"
                                    stroke="currentColor"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>)}
                    </div>
                </div>

                <div className="md:hidden" id="mobile-menu">
                    <div
                        className={`space-y-1 px-2 pt-2 pb-3 sm:px-3 md:hidden ${menuOpen ? "block" : "hidden"
                            }`}
                    >
                        <RenderContracts />
                    </div>
                    {state?.address == null ? (
                        <div className="flex items-center justify-end mx-2 pb-2">
                            <LoginButton />
                        </div>
                    ) : (
                        <div className="flex items-center px-5 pb-2">
                            <div
                                className="flex items-center"
                                onClick={() =>
                                    loginOpen ? setLoginOpen(false) : setLoginOpen(true)
                                }
                            >
                                <div className="flex-shrink-0">
                                    <div className="relative items-center bg-red-500 h-14 w-14 rounded-full font-xs font-bold text-center"></div>
                                </div>
                                <div className="ml-3">
                                    <div className="text-base font-medium leading-none text-white">
                                        {state?.address.slice(0, 3) +
                                            "..." +
                                            state?.address.slice(33)}
                                    </div>
                                    <div className="text-sm font-medium leading-none text-white">
                                        GhostNet
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => console.log("todo")}
                                type="button"
                                className="hidden ml-auto flex-shrink-0 rounded-full bg-gray-800 p-1 text-white hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
                            >
                                <span className="sr-only">View notifications</span>
                                <svg
                                    className="h-6 w-6"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.5"
                                    stroke="currentColor"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                                    />
                                </svg>
                            </button>
                        </div>
                    )}

                    <div
                        id={`${loginOpen}`}
                        className={`mt-3 space-y-1 px-2 ${loginOpen ? "block" : "hidden"}`}
                    >
                        <button
                            onClick={async e => {
                                e.preventDefault()
                                await disconnectWallet()
                            }}
                            className="block rounded-md px-3 py-2 text-base font-medium text-gray-400 hover:bg-gray-700 hover:text-white"
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            </nav >
        </div >
    );
};
export default NavBar;
