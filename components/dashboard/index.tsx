import { Defi, Price } from "../../utils/tzktHooks";
import Assets from "./assets";
import Balance from "./balance";
import Donut from "./donut";

type DashboardProps = {
  balance: number;
  tokens: Defi[];
  price: Price | null;
};

const Dashboard = ({ balance, tokens, price }: DashboardProps) => {
  return (
    <>
      <div>
        <div className="mx-auto flex max-w-7xl justify-start px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-extrabold text-white">Dashboard</h1>
        </div>
      </div>

      <main className="min-h-fit grow">
        <div className="mx-auto min-h-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div
            className={`grid w-full grid-cols-1 gap-8 rounded border-b border-zinc-900 bg-zinc-800 px-6 py-4 text-white md:grid-cols-1 lg:grid-cols-2`}
          >
            <div>
              <div className="grid max-w-[512px] grid-cols-2">
                <Balance
                  balance={balance}
                  evolution={price?.evolution}
                  price={price?.value}
                />
              </div>
              {tokens.length !== 0 && <Assets tokens={tokens} />}
            </div>
            {tokens.length !== 0 && (
              <Donut
                title="Token Repartition"
                tokens={tokens}
                colors={["#6F2DBD", "#98D2EB", "#FEFFA5", "#E86A92", "#3f3f49"]}
              />
            )}
          </div>
        </div>
      </main>
    </>
  );
};

export default Dashboard;
