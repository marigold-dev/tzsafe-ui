import Dashboard from "../../components/dashboard";
import Meta from "../../components/meta";
import useCurrentContract from "../../hooks/useCurrentContract";
import {
  useTzktBalance,
  useTzktDefiTokens,
  useTzktPrice,
} from "../../utils/tzktHooks";

const DashboardPage = () => {
  const address = useCurrentContract();

  // Get balance
  const balance = useTzktBalance(address);
  const tokens = useTzktDefiTokens(address);
  const price = useTzktPrice();

  return (
    <div className="min-h-content relative flex grow flex-col">
      <Meta title={"Dashboard - TzSafe"} />
      <Dashboard balance={balance} tokens={tokens} price={price} />
    </div>
  );
};

export default DashboardPage;
