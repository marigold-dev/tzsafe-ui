import { useContext } from "react";
import Meta from "../components/meta";
import TopUp from "../components/topUpForm";
import { AppStateContext } from "../context/state";

const TopUpPage = () => {
  const state = useContext(AppStateContext)!;

  return (
    <div className="min-h-content relative flex grow flex-col">
      <Meta title={"Fund wallet - TzSafe"} />
      <div>
        <div className="mx-auto flex max-w-7xl justify-start py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-extrabold text-white">Fund wallet</h1>
        </div>
      </div>
      <main className="h-full min-h-fit grow">
        <div className="mx-auto h-full min-h-full max-w-7xl py-6 px-4 sm:px-6 lg:px-8">
          {!state.currentContract ? (
            <h2 className="text-center text-xl text-zinc-600">
              Please select a wallet in the sidebar
            </h2>
          ) : (
            <TopUp
              address={state.currentContract ?? ""}
              closeModal={console.log}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default TopUpPage;
