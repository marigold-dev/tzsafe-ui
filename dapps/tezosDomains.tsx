import { Parser } from "@taquito/michel-codec";
import { Schema } from "@taquito/michelson-encoder";
import { bytes2Char } from "@taquito/tzip16";
import { contracts, CustomViewData, CustomView } from ".";
import logo from "../assets/images/TezosDomains.svg";
import Alias from "../components/Alias";
import { transaction } from "../components/RenderProposalContentLambda";
import { mutezToTez } from "../utils/tez";

const parser = new Parser();

export const COMMIT_ADDRESS = {
  mainnet: "KT1P8n2qzJjwMPbHJfi4o8xu6Pe3gaU3u2A3",
  ghostnet: "KT1PEnPDgGKyHvaGzWj6VJJYwobToiW2frff",
  name: "Publish intent",
};

export const buySchema = new Schema(
  parser.parseMichelineExpression(
    `(pair %buy (bytes %label) (pair (nat %duration) (pair (address %owner) (pair (option %address address) (pair (map %data string bytes) (nat %nonce))))))`
  )!
);

export const BUY_ADDRESS = {
  mainnet: "KT191reDVKrLxU9rjTSxg53wRqj6zh8pnHgr",
  ghostnet: "KT1Ks7BBTLLjD9PsdCboCL7fYEfq8z1mEvU1",
  name: "Buy a domain",
};

export const claimReverseRecordSchema = new Schema(
  parser.parseMichelineExpression(
    "(pair %claim_reverse_record (option %name bytes) (address %owner))"
  )!
);

export const CLAIM_REVERSE_RECORD = {
  mainnet: "KT1TnTr6b2YxSx2xUQ8Vz3MoWy771ta66yGx",
  ghostnet: "KT1H19ouy5QwDBchKXcUw1QRFs5ZYyx1ezEJ",
  name: "Set domain's target",
};

export const checkAddressSchema = new Schema(
  parser.parseMichelineExpression(
    "(pair %check_address (bytes %name) (address %address))"
  )!
);

export const CHECK_ADDRESS = {
  mainnet: "KT1F7JKNqwaoLzRsMio1MQC7zv3jG9dHcDdJ",
  ghostnet: "KT1B3j3At2XMF5P8bVoPD2WeJbZ9eaPiu3pD",
  name: "Check address",
};

export const setChildrenRecordSchema = new Schema(
  parser.parseMichelineExpression(
    `(pair %set_child_record (bytes %label)
                        (pair (bytes %parent)
                              (pair (option %address address)
                                    (pair (address %owner)
                                          (pair (map %data string bytes) (option %expiry timestamp))))))`
  )!
);

export const SET_CHILDREN_RECORD = {
  mainnet: "KT1QHLk1EMUA8BPH3FvRUeUmbTspmAhb7kpd",
  ghostnet: "KT1HpddfW7rX5aT2cTdsDaQZnH46bU7jQSTU",
  name: "Set children record",
};

export const updateRecordSchema = new Schema(
  parser.parseMichelineExpression(
    `(pair %update_record (bytes %name)
                     (pair (option %address address)
                           (pair (address %owner) (map %data string bytes))))`
  )!
);

export const UPDATE_RECORD = {
  mainnet: "KT1H1MqmUM4aK9i1833EBmYCCEfkbt6ZdSBc",
  ghostnet: "KT1Ln4t64RdCG1bK8zkH6Xi4nNQVxz7qNgyj",
  name: "Update record",
};

export const updateReverseRecordSchema = new Schema(
  parser.parseMichelineExpression(
    `(pair %update_reverse_record (address %address) (pair (option %name bytes) (address %owner)))`
  )!
);

export const UPDATE_REVERSE_RECORD = {
  mainnet: "KT1J9VpjiH5cmcsskNb8gEXpBtjD4zrAx4Vo",
  ghostnet: "KT1HDUc2xtPHqWQcjE1WuinTTHajXQN3asdk",
  name: "Update reverse record",
};

export const renewSchema = new Schema(
  parser.parseMichelineExpression(
    `(pair %renew (bytes %label) (nat %duration))`
  )!
);

export const RENEW = {
  mainnet: "KT1EVYBj3f1rZHNeUtq4ZvVxPTs77wuHwARU",
  ghostnet: "KT1Bv32pdMYmBJeMa2HsyUQZiC6FNj1dX6VR",
  name: "Renew domain",
};

export const bidSchema = new Schema(
  parser.parseMichelineExpression(`(pair %bid (bytes %label) (mutez %bid))`)!
);

export const BID = {
  mainnet: "KT1CaSP4dn8wasbMsfdtGiCPgYFW7bvnPRRT",
  ghostnet: "KT1P3wdbusZK2sj16YXxRViezzWCPXpiE28P",
  name: "Bid",
};

export const withdrawSchema = new Schema(
  parser.parseMichelineExpression(`(address %withdraw)`)!
);

export const WITHDRAW = {
  mainnet: "KT1CfuAbJQbAGYcjKfvEvbtNUx45LY5hfTVR",
  ghostnet: "KT1C7EF4c1pnPW9qcfNRiTPj5tBFMQJtvUhq",
  name: "Withdraw",
};

export const settleSchema = new Schema(
  parser.parseMichelineExpression(`(pair %settle (bytes %label)
              (pair (address %owner) (pair (option %address address) (map %data string bytes))))`)!
);

export const SETTLE = {
  mainnet: "KT1MeFfi4TzSCc8CF9j3qq5mecTPdc6YVUPp",
  ghostnet: "KT1DMNPg3b3fJQpjXULcXjucEXfwq3zGTKGo",
  name: "Settle",
};

export const tezosDomainsContracts = {
  COMMIT_ADDRESS,
  BUY_ADDRESS,
  CLAIM_REVERSE_RECORD,
  UPDATE_REVERSE_RECORD,
  UPDATE_RECORD,
  BID,
  SETTLE,
  WITHDRAW,
  RENEW,
  SET_CHILDREN_RECORD,
  CHECK_ADDRESS,
};

export const tezosDomainsContractsMatcher: contracts = {
  mainnet: {
    [CHECK_ADDRESS.mainnet]: true,
    [SET_CHILDREN_RECORD.mainnet]: true,
    [UPDATE_RECORD.mainnet]: true,
    [CLAIM_REVERSE_RECORD.mainnet]: true,
    [UPDATE_REVERSE_RECORD.mainnet]: true,
    [BUY_ADDRESS.mainnet]: true,
    [RENEW.mainnet]: true,
    [COMMIT_ADDRESS.mainnet]: true,
    [BID.mainnet]: true,
    [WITHDRAW.mainnet]: true,
    [SETTLE.mainnet]: true,
    KT1GY5qCWwmESfTv9dgjYyTYs2T5XGDSvRp1: true,
    KT1R4KPQxpFHAkX8MKCFmdoiqTaNSSpnJXPL: true,
    KT1Lu5om8u4ns2VWxcufgQRzjaLLhh3Qvf5B: true,
    KT1VxKQbYBVD8fSkqaewJGigL3tmcLWrsXcu: true,
  },
  ghostnet: {
    [CHECK_ADDRESS.ghostnet]: true,
    [SET_CHILDREN_RECORD.ghostnet]: true,
    [UPDATE_RECORD.ghostnet]: true,
    [CLAIM_REVERSE_RECORD.ghostnet]: true,
    [UPDATE_REVERSE_RECORD.ghostnet]: true,
    [BUY_ADDRESS.ghostnet]: true,
    [RENEW.ghostnet]: true,
    [COMMIT_ADDRESS.ghostnet]: true,
    [BID.ghostnet]: true,
    [WITHDRAW.ghostnet]: true,
    [SETTLE.ghostnet]: true,
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
    logoLink: "https://tezos.domains",
    logoAlt: "Tezos Domains",
    label: transactions
      .flatMap(({ addresses }) => {
        if (!addresses) return [];

        return [
          (() => {
            switch (addresses) {
              case COMMIT_ADDRESS.mainnet:
              case COMMIT_ADDRESS.ghostnet:
                return COMMIT_ADDRESS.name;
              case BUY_ADDRESS.mainnet:
              case BUY_ADDRESS.ghostnet:
                return BUY_ADDRESS.name;
              case CLAIM_REVERSE_RECORD.mainnet:
              case CLAIM_REVERSE_RECORD.ghostnet:
                return CLAIM_REVERSE_RECORD.name;
              case UPDATE_REVERSE_RECORD.mainnet:
              case UPDATE_REVERSE_RECORD.ghostnet:
                return UPDATE_REVERSE_RECORD.name;
              case UPDATE_RECORD.mainnet:
              case UPDATE_RECORD.ghostnet:
                return UPDATE_RECORD.name;
              case BID.mainnet:
              case BID.ghostnet:
                return BID.name;
              case SETTLE.mainnet:
              case SETTLE.ghostnet:
                return SETTLE.name;
              case WITHDRAW.mainnet:
              case WITHDRAW.ghostnet:
                return WITHDRAW.name;
              case RENEW.mainnet:
              case RENEW.ghostnet:
                return RENEW.name;
              case SET_CHILDREN_RECORD.mainnet:
              case SET_CHILDREN_RECORD.ghostnet:
                return SET_CHILDREN_RECORD.name;
              case CHECK_ADDRESS.mainnet:
              case CHECK_ADDRESS.ghostnet:
                return CHECK_ADDRESS.name;

              default:
                return "Interaction with Tezos Domains";
            }
          })(),
        ];
      })
      .join(", "),
    data: transactions.flatMap<CustomViewData>(transaction => {
      if (!transaction.params) return [];

      const price = transaction.amount;
      const micheline = parser.parseMichelineExpression(transaction.params);

      if (!micheline) return [];

      switch (transaction.addresses) {
        case tezosDomainsContracts.COMMIT_ADDRESS.ghostnet:
        case tezosDomainsContracts.COMMIT_ADDRESS.mainnet: {
          if (!("bytes" in micheline)) throw new Error("Wrong params");

          return [
            {
              action: COMMIT_ADDRESS.name,
              description:
                "Publishing the intent to buy a domain. It protects your domain from being taken by an adversary.",
              price,
            },
          ];
        }
        case tezosDomainsContracts.BUY_ADDRESS.ghostnet:
        case tezosDomainsContracts.BUY_ADDRESS.mainnet: {
          const data = buySchema.Execute(micheline);

          const domain = `${bytes2Char(data.label)}${
            transaction.addresses === tezosDomainsContracts.BUY_ADDRESS.mainnet
              ? ".tez"
              : ".gho"
          }`;

          return [
            {
              action: BUY_ADDRESS.name,
              description: (
                <ul className="list-inside list-disc space-y-1 pt-1 font-light">
                  <li>
                    Domain:{" "}
                    <a
                      href={`https://${
                        domain.endsWith(".gho") ? "ghostnet" : "app"
                      }.tezos.domains/domain/${domain}`}
                      title="Open domain infos"
                      className="underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {domain}
                    </a>
                  </li>
                  <li>
                    Owner: <Alias address={data.owner} />
                  </li>
                  <li>Duration: {data.duration.toString()} days</li>
                  {!!data.address?.Some && (
                    <li>
                      Pointing to: <Alias address={data.address.Some} />
                    </li>
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

          const domain = bytes2Char(data.name.Some);

          return [
            {
              action: CLAIM_REVERSE_RECORD.name,
              description: (
                <ul className="list-inside list-disc space-y-1 pt-1 font-light">
                  <li>
                    Owner: <Alias address={data.owner} />
                  </li>
                  {!!data.name?.Some && (
                    <li>
                      Domain:{" "}
                      <a
                        href={`https://${
                          domain.endsWith(".gho") ? "ghostnet" : "app"
                        }.tezos.domains/domain/${domain}`}
                        title="Open domain infos"
                        className="underline"
                        target="_blank"
                        rel="noreferre"
                      >
                        {domain}
                      </a>
                    </li>
                  )}
                </ul>
              ),
              price,
            },
          ];
        }
        case UPDATE_REVERSE_RECORD.mainnet:
        case UPDATE_REVERSE_RECORD.ghostnet: {
          const data = updateReverseRecordSchema.Execute(micheline);

          const domain = bytes2Char(data.name?.Some ?? "");

          return [
            {
              action: UPDATE_REVERSE_RECORD.name,
              description: (
                <ul className="list-inside list-disc space-y-1 pt-1 font-light">
                  <li>
                    Owner: <Alias address={data.owner} />
                  </li>
                  <li>
                    Address: <Alias address={data.address} />
                  </li>
                  {!!data.name?.Some && (
                    <li>
                      Domain:{" "}
                      <a
                        href={`https://${
                          domain.endsWith(".gho") ? "ghostnet" : "app"
                        }.tezos.domains/domain/${domain}`}
                        title="Open domain infos"
                        className="underline"
                        target="_blank"
                        rel="noreferre"
                      >
                        {domain}
                      </a>
                    </li>
                  )}
                </ul>
              ),
              price,
            },
          ];
        }
        case UPDATE_RECORD.mainnet:
        case UPDATE_RECORD.ghostnet: {
          const data = updateRecordSchema.Execute(micheline);

          const recordName = bytes2Char(data.name);

          return [
            {
              action: UPDATE_RECORD.name,
              description: (
                <ul className="list-inside list-disc space-y-1 pt-1 font-light">
                  <li>Record name: {recordName}</li>
                  {!!data.address.Some ? (
                    <li>
                      Owner: <Alias address={data.address.Some} />
                    </li>
                  ) : null}
                </ul>
              ),
              price,
            },
          ];
        }
        case BID.mainnet:
        case BID.ghostnet: {
          const data = bidSchema.Execute(micheline);

          return [
            {
              action: BID.name,
              description: (
                <ul className="list-inside list-disc space-y-1 pt-1 font-light">
                  <li>Label: {bytes2Char(data.label)}</li>
                  <li>Bid: {mutezToTez(data.bid.toNumber())} Tez</li>
                </ul>
              ),
              price,
            },
          ];
        }
        case SETTLE.mainnet:
        case SETTLE.ghostnet: {
          const data = settleSchema.Execute(micheline);

          return [
            {
              action: SETTLE.name,
              description: (
                <ul className="list-inside list-disc space-y-1 pt-1 font-light">
                  <li>
                    Owner: <Alias address={data.owner} />
                  </li>
                  <li>Label: {bytes2Char(data.label)}</li>
                  {!!data.address.Some ? (
                    <li>
                      Owner: <Alias address={data.address.Some} />
                    </li>
                  ) : null}
                </ul>
              ),
              price,
            },
          ];
        }
        case WITHDRAW.mainnet:
        case WITHDRAW.ghostnet: {
          const data = withdrawSchema.Execute(micheline);

          return [
            {
              action: WITHDRAW.name,
              description: (
                <ul className="list-inside list-disc space-y-1 pt-1 font-light">
                  <li>
                    Withdraw address: <Alias address={data} />
                  </li>
                </ul>
              ),
              price,
            },
          ];
        }
        case RENEW.mainnet:
        case RENEW.ghostnet: {
          const data = renewSchema.Execute(micheline);

          return [
            {
              action: RENEW.name,
              description: (
                <ul className="list-inside list-disc space-y-1 pt-1 font-light">
                  <li>Label: {bytes2Char(data.label)}</li>
                  <li>
                    Duration: {data.duration.toString()} day
                    {data.duration.toNumber() <= 1 ? "" : "s"}
                  </li>
                </ul>
              ),
              price,
            },
          ];
        }
        case SET_CHILDREN_RECORD.mainnet:
        case SET_CHILDREN_RECORD.ghostnet: {
          const data = setChildrenRecordSchema.Execute(micheline);

          return [
            {
              action: SET_CHILDREN_RECORD.name,
              description: (
                <ul className="list-inside list-disc space-y-1 pt-1 font-light">
                  <li>Label: {bytes2Char(data.label)}</li>
                  <li>
                    Parent: <Alias address={data.parent} />
                  </li>
                  <li>
                    Owner: <Alias address={data.owner} />
                  </li>
                </ul>
              ),
              price,
            },
          ];
        }
        case CHECK_ADDRESS.mainnet:
        case CHECK_ADDRESS.ghostnet: {
          const data = checkAddressSchema.Execute(micheline);

          return [
            {
              action: CHECK_ADDRESS.name,
              description: (
                <ul className="list-inside list-disc space-y-1 pt-1 font-light">
                  <li>Name: {bytes2Char(data.name)}</li>
                  <li>
                    Address: <Alias address={data.address} />{" "}
                  </li>
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
