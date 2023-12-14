import { Parser } from "@taquito/michel-codec";
import { bytes2Char } from "@taquito/tzip16";
import {
  buySchema,
  claimReverseRecordSchema,
  tezosDomainsContracts,
} from "../../../dapps/tezosDomains";
import { data } from "../../RenderProposalContentLambda";

const parser = new Parser();

export function RenderTezosDomainsRows({ rows }: { rows: data[] }) {
  return (
    <div className="mt-2 space-y-2">
      {rows.map((row, i) => {
        if (!row.params) return null;
        const micheline = parser.parseMichelineExpression(row.params);

        if (!micheline) return null;

        switch (row.addresses?.[0]) {
          case tezosDomainsContracts.COMMIT_ADDRESS.ghostnet:
          case tezosDomainsContracts.COMMIT_ADDRESS.mainnet: {
            if (!("bytes" in micheline)) throw new Error("Wrong params");

            return (
              <div key={i}>
                <h3>Commit</h3>
                <ul className="list-inside list-disc font-light">
                  <li className="w-1/2 truncate">
                    Commit hash: {micheline.bytes}
                  </li>
                </ul>
              </div>
            );
          }
          case tezosDomainsContracts.BUY_ADDRESS.ghostnet:
          case tezosDomainsContracts.BUY_ADDRESS.mainnet: {
            const data = buySchema.Execute(micheline);

            return (
              <div key={i}>
                <h3>Buy an address</h3>
                <ul className="list-inside list-disc font-light">
                  <li>
                    Domain:{" "}
                    {`${bytes2Char(data.label)}${
                      row.addresses?.[0] ===
                      tezosDomainsContracts.BUY_ADDRESS.mainnet
                        ? ".tez"
                        : ".gho"
                    }`}
                  </li>
                  <li>Owner: {data.owner}</li>
                  <li>Duration: {data.duration.toString()} days</li>
                  {!!data.address?.Some && (
                    <li>Pointing to: {data.address.Some}</li>
                  )}
                </ul>
              </div>
            );
          }
          case tezosDomainsContracts.CLAIM_REVERSE_RECORD.ghostnet:
          case tezosDomainsContracts.CLAIM_REVERSE_RECORD.mainnet: {
            const data = claimReverseRecordSchema.Execute(micheline);

            return (
              <div key={i}>
                <h3>Claim reverse record</h3>
                <ul className="list-inside list-disc font-light">
                  <li>Owner: {data.owner}</li>
                  {!!data.name?.Some && (
                    <li>Domain: {bytes2Char(data.name.Some)}</li>
                  )}
                </ul>
              </div>
            );
          }
          default:
            return null;
        }
      })}
    </div>
  );
}
