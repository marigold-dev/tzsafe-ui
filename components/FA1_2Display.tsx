import BigNumber from "bignumber.js";
import React from "react";
import { fa1_2Token } from "../types/display";
import Alias from "./Alias";

const FA1_2Display: React.FC<{
  data: fa1_2Token;
  to: string | undefined;
  amount: BigNumber;
}> = ({ data, to, amount }) => {
  if (
    Object.entries(data).some(
      ([key, value]) => key !== "imageUri" && value === undefined
    )
  ) {
    return <div>{JSON.stringify(data)}</div>;
  }

  return (
    <div className="items-left flex flex-col p-4 sm:flex-row sm:space-x-3">
      {data.imageUri && (
        <div className="mb-4 sm:mb-0 sm:flex-shrink-0">
          <img
            src={data.imageUri}
            alt={data.name || "Image"}
            className="h-20 w-20 rounded-lg object-cover shadow-lg sm:h-32 sm:w-32 md:h-28 md:w-28"
          />
        </div>
      )}
      <div>
        <div>
          <strong>Name:</strong> {data.name}
        </div>
        <div>
          <strong>FA1.2 Address:</strong> <Alias address={data.fa1_2_address} />
        </div>
        <div>
          <strong>To:</strong> <Alias address={to as string} />
        </div>
        <div>
          <strong>Amount:</strong>{" "}
          {data.hasDecimal ? amount.toString() : amount.toString() + "*"}
        </div>
      </div>
    </div>
  );
};

export default FA1_2Display;
