import { fold } from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as t from "io-ts";
import React from "react";
import Alias from "./Alias";

const FA1_2DataCodec = t.type({
  name: t.string,
  fa1_2_address: t.string,
  imageUri: t.union([t.string, t.undefined]),
});

type FA1_2Data = t.TypeOf<typeof FA1_2DataCodec>;

const FA1_2Display: React.FC<{ data: string }> = ({ data }) => {
  let jsonData;

  try {
    jsonData = JSON.parse(data);
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return <div>{data}</div>;
  }

  const result = FA1_2DataCodec.decode(jsonData);

  return pipe(
    result,
    fold(
      errors => <div>{data}</div>,
      fa1_2data => (
        <div className="items-left flex flex-col p-4 sm:flex-row sm:space-x-3">
          {fa1_2data.imageUri && (
            <div className="mb-4 sm:mb-0 sm:flex-shrink-0">
              <img
                src={fa1_2data.imageUri}
                alt={fa1_2data.name}
                className="h-20 w-20 rounded-lg object-cover shadow-lg sm:h-32 sm:w-32 md:h-28 md:w-28"
              />
            </div>
          )}
          <div>
            <div>
              <strong>Name:</strong> {fa1_2data.name}
            </div>
            <div>
              <strong>FA1.2 Address:</strong>{" "}
              <Alias address={fa1_2data.fa1_2_address} />
            </div>
          </div>
        </div>
      )
    )
  );
};

export default FA1_2Display;
