import { Parser } from "@taquito/michel-codec";
import { Schema } from "@taquito/michelson-encoder";
import { bytes2Char } from "@taquito/tzip16";
import { contracts, CustomViewData, CustomView } from ".";
import logo from "../assets/images/TezosDomains.svg";
import { transaction } from "../components/RenderProposalContentLambda";

const parser = new Parser();

export const COMMIT_ADDRESS = {
  mainnet: "KT1P8n2qzJjwMPbHJfi4o8xu6Pe3gaU3u2A3",
  ghostnet: "KT1PEnPDgGKyHvaGzWj6VJJYwobToiW2frff",
};

export const buySchema = new Schema(
  parser.parseMichelineExpression(
    `(pair %buy (bytes %label) (pair (nat %duration) (pair (address %owner) (pair (option %address address) (pair (map %data string bytes) (nat %nonce))))))`
  )!
);

export const BUY_ADDRESS = {
  mainnet: "KT191reDVKrLxU9rjTSxg53wRqj6zh8pnHgr",
  ghostnet: "KT1Ks7BBTLLjD9PsdCboCL7fYEfq8z1mEvU1",
};

export const claimReverseRecordSchema = new Schema(
  parser.parseMichelineExpression(
    "(pair %claim_reverse_record (option %name bytes) (address %owner))"
  )!
);

export const CLAIM_REVERSE_RECORD = {
  mainnet: "KT1TnTr6b2YxSx2xUQ8Vz3MoWy771ta66yGx",
  ghostnet: "KT1H19ouy5QwDBchKXcUw1QRFs5ZYyx1ezEJ",
};

export const tezosDomainsContracts = {
  COMMIT_ADDRESS,
  BUY_ADDRESS,
  CLAIM_REVERSE_RECORD,
};

export const tezosDomainsContractsMatcher: contracts = {
  mainnet: {
    KT1F7JKNqwaoLzRsMio1MQC7zv3jG9dHcDdJ: true,
    KT1QHLk1EMUA8BPH3FvRUeUmbTspmAhb7kpd: true,
    KT1H1MqmUM4aK9i1833EBmYCCEfkbt6ZdSBc: true,
    KT1TnTr6b2YxSx2xUQ8Vz3MoWy771ta66yGx: true,
    KT1J9VpjiH5cmcsskNb8gEXpBtjD4zrAx4Vo: true,
    [BUY_ADDRESS.mainnet]: true,
    KT1EVYBj3f1rZHNeUtq4ZvVxPTs77wuHwARU: true,
    KT1P8n2qzJjwMPbHJfi4o8xu6Pe3gaU3u2A3: true,
    KT1CaSP4dn8wasbMsfdtGiCPgYFW7bvnPRRT: true,
    KT1CfuAbJQbAGYcjKfvEvbtNUx45LY5hfTVR: true,
    KT1MeFfi4TzSCc8CF9j3qq5mecTPdc6YVUPp: true,
    KT1GY5qCWwmESfTv9dgjYyTYs2T5XGDSvRp1: true,
    KT1R4KPQxpFHAkX8MKCFmdoiqTaNSSpnJXPL: true,
    KT1Lu5om8u4ns2VWxcufgQRzjaLLhh3Qvf5B: true,
    KT1VxKQbYBVD8fSkqaewJGigL3tmcLWrsXcu: true,
  },
  ghostnet: {
    KT1B3j3At2XMF5P8bVoPD2WeJbZ9eaPiu3pD: true,
    KT1HpddfW7rX5aT2cTdsDaQZnH46bU7jQSTU: true,
    KT1Ln4t64RdCG1bK8zkH6Xi4nNQVxz7qNgyj: true,
    KT1H19ouy5QwDBchKXcUw1QRFs5ZYyx1ezEJ: true,
    KT1HDUc2xtPHqWQcjE1WuinTTHajXQN3asdk: true,
    [BUY_ADDRESS.ghostnet]: true,
    KT1Bv32pdMYmBJeMa2HsyUQZiC6FNj1dX6VR: true,
    KT1PEnPDgGKyHvaGzWj6VJJYwobToiW2frff: true,
    KT1P3wdbusZK2sj16YXxRViezzWCPXpiE28P: true,
    KT1C7EF4c1pnPW9qcfNRiTPj5tBFMQJtvUhq: true,
    KT1DMNPg3b3fJQpjXULcXjucEXfwq3zGTKGo: true,
  },
};

export function tezosDomains(transactions: Array<transaction>): CustomView {
  if (
    !transactions.every(
      ({ addresses }) =>
        !!addresses &&
        (tezosDomainsContractsMatcher.mainnet[addresses] ||
          tezosDomainsContractsMatcher.ghostnet[addresses])
    )
  )
    return undefined;

  return {
    logo: logo.src,
    logoAlt: "Tezos Domains",
    label: transactions
      .flatMap(({ addresses }) => {
        if (!addresses) return [];

        return [
          (() => {
            switch (addresses) {
              case COMMIT_ADDRESS.mainnet:
              case COMMIT_ADDRESS.ghostnet:
                return "Publish intent";
              case BUY_ADDRESS.mainnet:
              case BUY_ADDRESS.ghostnet:
                return "Buy a domain";
              case CLAIM_REVERSE_RECORD.mainnet:
              case CLAIM_REVERSE_RECORD.ghostnet:
                return "Set domain's target";
              default:
                return "Interaction with Tezos Domains";
            }
          })(),
        ];
      })
      .join(", "),
    data: transactions.flatMap<CustomViewData>(transaction => {
      if (!transaction.params) return [];
      const price = transaction.amount ? Number(transaction.amount) : undefined;
      const micheline = parser.parseMichelineExpression(transaction.params);

      if (!micheline) return [];

      switch (transaction.addresses) {
        case tezosDomainsContracts.COMMIT_ADDRESS.ghostnet:
        case tezosDomainsContracts.COMMIT_ADDRESS.mainnet: {
          if (!("bytes" in micheline)) throw new Error("Wrong params");

          return [
            {
              action: "Publish intent",
              description:
                "Publishing the intent to buy a domain. It protects your domain from being taken by an adversary.",
              price,
            },
          ];
        }
        case tezosDomainsContracts.BUY_ADDRESS.ghostnet:
        case tezosDomainsContracts.BUY_ADDRESS.mainnet: {
          const data = buySchema.Execute(micheline);

          return [
            {
              action: "Buy a domain",
              description: (
                <ul className="list-inside list-disc space-y-1 pt-1 font-light">
                  <li>
                    Domain:{" "}
                    {`${bytes2Char(data.label)}${
                      transaction.addresses ===
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
              ),
              price,
            },
          ];
        }
        case tezosDomainsContracts.CLAIM_REVERSE_RECORD.ghostnet:
        case tezosDomainsContracts.CLAIM_REVERSE_RECORD.mainnet: {
          const data = claimReverseRecordSchema.Execute(micheline);

          return [
            {
              action: "Set domain's target",
              description: (
                <ul className="list-inside list-disc space-y-1 pt-1 font-light">
                  <li>Owner: {data.owner}</li>
                  {!!data.name?.Some && (
                    <li>Domain: {bytes2Char(data.name.Some)}</li>
                  )}
                </ul>
              ),
              price,
            },
          ];
        }
        default:
          return [];
      }
    }),
  };
}
