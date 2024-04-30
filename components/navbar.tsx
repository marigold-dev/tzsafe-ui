import { NetworkType } from "@airgap/beacon-sdk";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useState } from "react";
import tzSafeLogo from "../assets/images/TzSafe.svg";
import { PREFERED_NETWORK } from "../context/config";
import { useContracts } from "../context/contracts";
import { useAppDispatch } from "../context/state";
import { useWallet } from "../context/wallet";
import Alias from "./Alias";
import LinkComponent from "./links";
import LoginButton from "./loginButton";

const NavBar = (_: React.PropsWithChildren) => {
  const { userAddress, disconnectWallet } = useWallet();
  let [menuOpen, setMenuOpen] = useState(false);

  const router = useRouter();
  const dispatch = useAppDispatch();
  const { contracts } = useContracts();

  const disconnect = async (): Promise<void> => {
    disconnectWallet();

    dispatch({ type: "logout" });
    router.push("/");
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav
      className={`${
        menuOpen ? "h-auto" : "h-20"
      } fixed left-0 right-0 top-0 z-40 flex w-full flex-col items-center border-b-4 border-zinc-500 bg-graybg md:flex-row`}
    >
      <div className="mx-auto w-full px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link
                href="/"
                className="flex items-center text-xl font-bold tracking-wider text-white"
              >
                <Image
                  src={tzSafeLogo}
                  alt="Tzsafe logo"
                  className="h-16 w-auto"
                />
                <div>
                  <p className="ml-4 mt-1 text-xs">
                    {PREFERED_NETWORK === NetworkType.MAINNET
                      ? "Mainnet"
                      : PREFERED_NETWORK === NetworkType.GHOSTNET
                      ? "Ghostnet"
                      : "Custom"}
                  </p>
                </div>
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <LinkComponent path="/address-book" text={"Address book"} />
                <LinkComponent path="/new-wallet" text={"New wallet"} />
                <LinkComponent path="/import-wallet" text={"Import wallet"} />
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              <button
                onClick={() => console.log("todo")}
                type="button"
                className="hidden rounded-full bg-zinc-800 p-1 text-zinc-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-zinc-800"
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

              {!userAddress ? (
                <div className="relative ml-3">
                  <LoginButton />
                </div>
              ) : (
                <div className="group relative ml-3 ">
                  <div className="flex items-end">
                    <button
                      type="button"
                      className=" focus:border-offset-2 focus:border-offset-zinc-800  max-w-xs items-center bg-zinc-800 px-2 py-1 text-sm focus:border-2 focus:border-white focus:outline-none"
                      id="user-menu-button"
                      aria-expanded="false"
                      aria-haspopup="true"
                    >
                      <span className="sr-only">Open user menu</span>
                      <div className="flex flex-col items-center text-white">
                        <Alias
                          address={userAddress}
                          disabled
                          className="cursor-pointer"
                        />
                      </div>
                    </button>
                  </div>
                  <div
                    className={`absolute right-0 z-10 mt-2 hidden w-48  origin-top-right bg-white py-1 shadow-lg ring-1 ring-black  ring-opacity-5 group-focus-within:block  group-focus-within:outline-none `}
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="user-menu-button"
                  >
                    <button
                      onClick={async e => {
                        e.preventDefault();
                        await disconnect();
                      }}
                      className="text-md block px-4 py-2 text-dark"
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

          {contracts && (
            <div className={`-mr-2 flex space-x-4 md:hidden`}>
              {!userAddress ? (
                <div className="mx-2 flex items-center justify-center">
                  <LoginButton />
                </div>
              ) : (
                <div className="flex items-center">
                  <div className="md:ml-3">
                    <div className="text-base font-medium leading-none text-white">
                      <Alias
                        address={userAddress}
                        length={3}
                        className="block w-28 truncate text-right"
                      />
                    </div>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  menuOpen ? setMenuOpen(false) : setMenuOpen(true);
                }}
                className="inline-flex items-center justify-center rounded-md bg-zinc-800 p-2 text-white text-zinc-400 hover:bg-zinc-700 hover:text-white focus:outline-none"
                aria-controls="mobile-menu"
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                <svg
                  className="block h-6 w-6 fill-white"
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
            </div>
          )}
        </div>
      </div>

      <div
        className={`${menuOpen ? "" : "hidden"} w-full md:hidden`}
        id="mobile-menu"
      >
        <div className={`w-full space-y-1 px-2 pb-3 pt-2 text-left sm:px-3`}>
          <LinkComponent
            onClick={closeMenu}
            path="/address-book"
            text={"Address book"}
          />
          <LinkComponent
            onClick={closeMenu}
            path="/new-wallet"
            text={"New wallet"}
          />
          <LinkComponent
            onClick={closeMenu}
            path="/import-wallet"
            text={"Import wallet"}
          />
        </div>
        {!!userAddress && (
          <div className="-mt-1 space-y-1 px-2">
            <button
              onClick={async e => {
                e.preventDefault();
                await disconnectWallet();
              }}
              className="block rounded-md px-3 py-2 text-base font-medium  text-white hover:bg-zinc-700 hover:text-white"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};
export default NavBar;
