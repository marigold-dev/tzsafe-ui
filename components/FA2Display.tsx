import React from "react";
import { fa2Tokens } from "../types/display";
import Alias from "./Alias";

const FA2Display: React.FC<{ data: fa2Tokens }> = ({ data }) => {
  if (
    data.some(
      item =>
        !item.name ||
        !item.fa2_address ||
        item.token_id === undefined ||
        !item.to ||
        item.amount === undefined
    )
  ) {
    return <div>{JSON.stringify(data)}</div>;
  }

  return (
    <div>
      {data.map((fa2, index) => (
        <div
          key={index}
          className="items-left flex flex-col justify-center p-4 sm:flex-row sm:space-x-4"
        >
          {fa2.imageUri && (
            <div className="mb-4 sm:mb-0 sm:flex-shrink-0">
              <img
                src={fa2.imageUri}
                alt={fa2.name ?? "Image"}
                className="h-24 w-24 rounded-lg object-cover shadow-lg sm:h-32 sm:w-32 md:h-28 md:w-28"
              />
            </div>
          )}
          <div className="flex-1">
            <div>
              <strong>Name:</strong> {fa2.name}
            </div>
            <div>
              <strong>Address:</strong>{" "}
              <Alias address={fa2.fa2_address as string} />
            </div>
            <div>
              <strong>Token ID:</strong> {fa2.token_id}
            </div>
            <div>
              <strong>To:</strong> <Alias address={fa2.to as string} />
            </div>
            <div>
              <strong>Amount:</strong>{" "}
              {fa2.hasDecimal
                ? fa2.amount.toString()
                : fa2.amount.toString() + "*"}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FA2Display;
