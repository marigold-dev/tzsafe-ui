import Link from "next/link";
import Meta from "../components/meta";

function Home() {
  return (
    <div className="min-h-content relative flex grow flex-col">
      <Meta title={"Welcome - TzSafe"} />

      <div>
        <div>
          <div className="mx-auto  flex max-w-7xl justify-start px-4 py-6 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-extrabold text-white">
              Welcome to TzSafe
            </h1>
          </div>
        </div>
        <main className="grow">
          <div className="mx-auto max-w-7xl pb-6 sm:px-6 lg:px-8">
            <div className="md:py-6">
              <div className="grid min-h-fit grid-rows-2 gap-8 p-4 md:h-96 md:grid-cols-2 md:grid-rows-1 md:p-0">
                <div className="grid min-h-max grid-rows-5 rounded bg-graybg p-4">
                  <div className="row-span-6">
                    <h2 className="text-xl font-extrabold text-white md:text-2xl">
                      Create new TzSafe wallet
                    </h2>
                    <p className="md:text-l text-s my-2 break-words font-light text-white md:my-6 md:w-3/4">
                      Create a new TzSafe wallet for an advanced management of
                      ownership and security to guard Tezos assets
                    </p>
                  </div>
                  <Link
                    type="button"
                    href={{ pathname: "/new-wallet" }}
                    className={
                      "text-md row-span-1 w-1/2 max-w-xs items-center justify-self-end rounded bg-primary px-2 py-2 text-center font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500  md:px-1 md:py-1.5 md:text-2xl "
                    }
                    id="user-menu-button"
                    aria-expanded="false"
                    aria-haspopup="true"
                  >
                    Create
                  </Link>
                </div>
                <div className="grid min-h-max grid-rows-5 rounded bg-graybg p-4">
                  <div className="row-span-6">
                    <h2 className="text-xl font-extrabold text-white md:text-2xl">
                      Import TzSafe wallet
                    </h2>
                    <p className="md:text-l text-s my-2 break-words font-light text-white md:my-6 md:w-3/4">
                      Already have a TzSafe wallet or want to access it from a
                      different device? Load it using its address
                    </p>
                  </div>
                  <Link
                    type="button"
                    href={{ pathname: "/import-wallet" }}
                    className={
                      "text-md row-span-1 w-1/2 max-w-xs items-center justify-self-end rounded bg-primary px-2 py-2 text-center font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500 md:px-1 md:py-1.5 md:text-2xl "
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
    </div>
  );
}
export default Home;
