import { fold } from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as t from "io-ts";
import React from "react";
import Alias from "./Alias";

const FA2DataCodec = t.array(
  t.type({
    fa2_address: t.string,
    name: t.string,
    token_id: t.number,
    to: t.string,
    imageUri: t.union([t.string, t.undefined]),
    amount: t.string,
  })
);

const FA2Display: React.FC<{ data: string }> = ({ data }) => {
  let jsonData;

  try {
    jsonData = JSON.parse(data);
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return <div>{data}</div>;
  }

  const result = FA2DataCodec.decode(jsonData);

  return pipe(
    result,
    fold(
      errors => <div>{data}</div>,
      fa2Data => (
        <div>
          {fa2Data.map((fa2, index) => (
            <div
              key={index}
              className="items-left flex flex-col justify-center p-4 sm:flex-row sm:space-x-4"
            >
              {fa2.imageUri && (
                <div className="mb-4 sm:mb-0 sm:flex-shrink-0">
                  <img
                    src={fa2.imageUri}
                    alt={fa2.name}
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
                  {<Alias address={fa2.fa2_address} />}
                </div>
                <div>
                  <strong>Token ID:</strong> {fa2.token_id}
                </div>
                <div>
                  <strong>To:</strong> {<Alias address={fa2.to} />}
                </div>
                <div>
                  <strong>Amount:</strong> {fa2.amount}
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    )
  );
};

export default FA2Display;
