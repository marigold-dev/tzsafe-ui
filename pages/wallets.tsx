import Link from "next/link";
import { useContext } from "react";
import Meta from "../components/meta";
import NavBar from "../components/navbar";
import { AppDispatchContext, AppStateContext } from "../context/state";

function Home() {
  let state = useContext(AppStateContext)!;
  let dispatch = useContext(AppDispatchContext)!;
  return (
    <div className="relative  min-h-content flex flex-col grow">
      <Meta title={"Wallets"} />
      <div className="bg-graybg shadow">
        <div className="mx-auto  max-w-7xl py-6 px-4 sm:px-6 lg:px-8 flex justify-start">
          <h1 className="text-white text-2xl font-extrabold">
            Imported wallets
          </h1>
        </div>
      </div>
      <main className="bg-gray-100 h-full grow min-h-fit">
        <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8 h-full min-h-full">
          <div className="px-4 py-6 sm:px-0 h-full min-h-full">
            <div className="h-full min-h-full border-4 border-dashed border-white grid-rows-auto md:grid-cols-auto md:auto-rows-max grid p-2 overflow-y-auto">
              {state?.contracts &&
                Object.entries(state!.contracts).map(([address, _contract]) => {
                  return (
                    <Link
                      key={address}
                      className=" flex md:flex-row flex-col justify-between bg-primary font-medium text-white my-2 p-2 hover:bg-red-500 focus:bg-red-500 hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                      href={`/wallets/${address}`}
                    >
                      {state.aliases[address] ? (
                        <div>
                          <p className="text-xs md:text-xl">
                            {state.aliases[address]}{" "}
                            {state.contracts[address].version ||
                              "Unknown version"}
                          </p>
                          <p className="text-xs md:text-xl">{address}</p>
                        </div>
                      ) : (
                        <p className="text-xs md:text-xl">
                          {address}{" "}
                          {state.contracts[address].version ||
                            "Unknown version"}
                        </p>
                      )}
                      <div className="grid grid-rows-1 grid-cols-2 gap-2 align-middle justify-end items-end">
                        <button
                          className="justify-self-end my-auto"
                          onClick={(e) => {
                            e.preventDefault();
                            state.favouriteContract !== address && dispatch!({
                              type: "setFavourite",
                              address: address,
                            });
                          }}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 my-auto justify-self-end">
                            <path className={(state.favouriteContract === address ? "fill-yellow-400" : "fill-none") + " hover:fill-yellow-500 hover:border-offset-2  hover:border-offset-gray-800"} strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                          </svg>
                        </button>
                        <button
                          className="bg-dark hover:bg-neutral-800  font-medium text-white my-2 p-2 md:text-xl text-s hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                          onClick={(e) => {
                            e.preventDefault();
                            dispatch!({
                              type: "removeContract",
                              address: address,
                            });
                          }}
                        >
                          Remove wallet
                        </button>
                      </div>
                    </Link>
                  );
                })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Home;
