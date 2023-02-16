import Link from "next/link";
import { useContext } from "react";
import Meta from "../components/meta";
import { AppStateContext } from "../context/state";
import { Wallet } from "./wallets/[wallet]";

function Home() {
  let state = useContext(AppStateContext)!;

  return (
    <div className="min-h-content relative flex grow flex-col">
      <Meta title={"Welcome"} />
      {state.favouriteContract && state.contracts[state.favouriteContract] ? (
        <Wallet address={state.favouriteContract} />
      ) : (
        <div>
          <div className="bg-blue shadow">
            <div className="mx-auto  flex max-w-7xl justify-start py-6 px-4 sm:px-6 lg:px-8">
              <h1 className="text-2xl font-extrabold text-white">
                Welcome to Multisig
              </h1>
            </div>
          </div>
          <main className="bg-gray-100 h-full grow">
            <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
              <div className="px-4 py-6 sm:px-0">
                <div className="grid min-h-fit grid-rows-2 gap-2 border-4 border-dashed border-white p-2 md:h-96 md:grid-cols-1 md:grid-rows-1">
                  <div className="grid min-h-max  grid-rows-5  bg-graybg p-4 md:rounded-tr-none">
                    <div className="row-span-6">
                      <h2 className="text-xl font-extrabold text-white md:text-2xl">
                        Create new Multisig wallet
                      </h2>
                      <p className="md:text-l text-s my-2 break-words font-extrabold text-white md:my-6 md:w-3/4">
                        Create a new Multisig wallet that is controlled by one
                        or multiple signers.
                      </p>
                    </div>
                    <Link
                      type="button"
                      href={{ pathname: "/create" }}
                      className={
                        " text-md row-span-1 w-1/2 max-w-xs items-center justify-self-end bg-primary py-2 px-2 text-center font-bold text-white hover:bg-red-500 hover:outline-none focus:bg-red-500  md:py-1.5 md:px-1 md:text-2xl "
                      }
                      id="user-menu-button"
                      aria-expanded="false"
                      aria-haspopup="true"
                    >
                      Create
                    </Link>
                  </div>
                  <div className="r grid  min-h-max grid-rows-5 bg-graybg p-4">
                    <div className="row-span-6">
                      <h2 className="text-xl font-extrabold text-white md:text-2xl">
                        Import existing multisig
                      </h2>
                      <p className="md:text-l text-s my-2 break-words font-extrabold text-white md:my-6 md:w-3/4">
                        Already have a Multisig wallet or want to access it from
                        a different device? Load it using its address
                      </p>
                    </div>
                    <Link
                      type="button"
                      href={{ pathname: "/import" }}
                      className={
                        " text-md row-span-1 w-1/2 max-w-xs items-center justify-self-end bg-primary py-2 px-2 text-center font-bold text-white hover:bg-red-500 hover:outline-none focus:bg-red-500  md:py-1.5 md:px-1 md:text-2xl "
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
      )}
    </div>
  );
}
export default Home;
