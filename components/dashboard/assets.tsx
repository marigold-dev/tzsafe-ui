import { Defi } from "../../utils/tzktHooks";

type AssetsProps = {
  tokens: Defi[];
};

const Assets = ({ tokens }: AssetsProps) => {
  return (
    <>
      <div className="mt-6 text-xl">Assets</div>
      <div className="max-h-[320px] overflow-y-auto">
        {tokens.map((token, i) => {
          return (
            <div key={i} className="mt-2 flex">
              <img src={token.icon} style={{ width: "24px", height: "24px" }} />
              <span className="ml-2 font-light">{token.balance}</span>
              <span className="ml-2 font-light">{token.symbol}</span>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default Assets;
