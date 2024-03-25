import { useContext } from "react";
import Meta from "../../components/meta";
import { AppStateContext } from "../../context/state";
import {
  useTzktBalance,
  useTzktDefiTokens,
  useTzktPrice,
} from "../../utils/tzktHooks";

const Dashboard = () => {
  const state = useContext(AppStateContext)!;
  const address = state.currentContract;

  // Get balance
  const balance = useTzktBalance(address);
  const tokens = useTzktDefiTokens(address);
  const price = useTzktPrice();

  const tezValue = price ? price.value * balance : null;
  const isPriceIncreasing = price ? price.evolution >= 1 : false;

  return (
    <div className="min-h-content relative flex grow flex-col">
      <Meta title={"Dashboard - TzSafe"} />

      <div>
        <div className="mx-auto flex max-w-7xl justify-start px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-extrabold text-white">Dashboard</h1>
        </div>
      </div>

      <main className="min-h-fit grow">
        <div className="mx-auto min-h-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Balance card */}
          <div className="grid w-full grid-cols-1 gap-8 rounded border-b border-zinc-900 bg-zinc-800 px-6 py-4 text-white md:grid-cols-1 lg:grid-cols-1">
            <div>
              <div className="grid max-w-[512px] grid-cols-2">
                <div className="text-xl">Balance</div>
                <div
                  className={`font-light ${
                    isPriceIncreasing ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {isPriceIncreasing ? "+" : "-"}
                  {price ? ((price.evolution - 1) * 100).toFixed(2) : null}%
                </div>
                <div className="font-light">{balance.toFixed(2)} XTZ</div>
                {tezValue ? (
                  <div className="font-light">{tezValue.toFixed(2)} $</div>
                ) : (
                  <></>
                )}
              </div>
              {tokens.length != 0 && (
                <>
                  <div className="mt-6 text-xl">Assets</div>
                  <div className="max-h-[320px] overflow-y-auto">
                    {tokens.map(token => {
                      return (
                        <div className="mt-2 flex">
                          <img
                            src={token.icon}
                            style={{ width: "24px", height: "24px" }}
                          />
                          <span className="ml-2 font-light">
                            {token.balance}
                          </span>
                          <span className="ml-2 font-light">
                            {token.symbol}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
