import Link from "next/link";
import { useContext } from "react";
import Meta from "../components/meta";
import NavBar from "../components/navbar";
import { AppDispatchContext, AppStateContext } from "../context/state";

function Home() {
  let state = useContext(AppStateContext)!;
  let dispatch = useContext(AppDispatchContext)!;
  return (
    <div className="min-h-content  relative flex grow flex-col">
      <Meta title={"Wallets - TzSafe"} />
      <div className="bg-graybg shadow">
        <div className="mx-auto  flex max-w-7xl justify-start py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-extrabold text-white">
            Imported wallets
          </h1>
        </div>
      </div>
      <main className="min-h-fit grow">
        <div className="mx-auto min-h-full max-w-7xl py-6 sm:px-6 lg:px-8">
          <div className="h-full min-h-full px-4 py-6 sm:px-0">
            <div className="grid-rows-auto md:grid-cols-auto grid h-full min-h-full overflow-y-auto  p-2 md:auto-rows-max">
              {state?.contracts &&
                Object.entries(state!.contracts).map(([address, _contract]) => {
                  return (
                    <Link
                      key={address}
                      className="my-2 flex flex-col justify-between bg-primary p-2 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500 md:flex-row"
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
                      <div className="grid grid-cols-2 grid-rows-1 items-end justify-end gap-2 align-middle">
                        <button
                          className="my-auto justify-self-end"
                          onClick={e => {
                            e.preventDefault();
                            state.favouriteContract !== address &&
                              dispatch!({
                                type: "setFavourite",
                                address: address,
                              });
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="my-auto h-12 w-12 justify-self-end"
                          >
                            <path
                              className={
                                (state.favouriteContract === address
                                  ? "fill-yellow-400"
                                  : "fill-none") +
                                "hover:border-offset-2 hover:border-offset-zinc-800  hover:fill-yellow-500"
                              }
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                            />
                          </svg>
                        </button>
                        <button
                          className="text-s my-2 bg-dark p-2 font-medium text-white hover:bg-neutral-800 hover:outline-none md:text-xl"
                          onClick={e => {
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
