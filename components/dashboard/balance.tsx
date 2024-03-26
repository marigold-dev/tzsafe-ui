type BalanceProps = {
  balance: number;
  evolution?: number;
  price?: number;
};

const Balance = ({ balance, evolution, price }: BalanceProps) => {
  const isPriceIncreasing = evolution ? evolution >= 1 : false;
  return (
    <>
      <div className="text-xl">Balance</div>
      <div />
      <div className="whitespace-nowrap font-light">
        {balance.toFixed(2)} XTZ
      </div>
      <div className="whitespace-nowrap font-light">
        <span>{price && (balance * price).toFixed(2)}$</span>
        <span
          className={`ml-1 font-extralight ${
            isPriceIncreasing ? "text-emerald-500" : "text-red-500"
          }`}
        >
          ({isPriceIncreasing ? "+" : "-"}
          {evolution && ((evolution - 1) * 100).toFixed(2)}%)
        </span>
      </div>
    </>
  );
};

export default Balance;
