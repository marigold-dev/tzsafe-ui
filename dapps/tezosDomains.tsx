import { Parser } from "@taquito/michel-codec";
import { MichelsonMap, Schema } from "@taquito/michelson-encoder";
import { TezosToolkit } from "@taquito/taquito";
import { bytesToString } from "@taquito/tzip16";
import BigNumber from "bignumber.js";
import React, { ReactNode, useEffect, useState } from "react";
import { contracts, CustomViewData, CustomView } from ".";
import logo from "../assets/images/TezosDomains.svg";
import Alias from "../components/Alias";
import { transaction } from "../components/RenderProposalContentLambda";
import { getTokenMetadata } from "../utils/getTokenMetadata";
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

export const setChildRecordSchema = new Schema(
  parser.parseMichelineExpression(
    `(pair %set_child_record (bytes %label)
                        (pair (bytes %parent)
                              (pair (option %address address)
                                    (pair (address %owner)
                                          (pair (map %data string bytes) (option %expiry timestamp))))))`
  )!
);

export const SET_CHILD_RECORD = {
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

export const executeOfferSchema = new Schema(
  parser.parseMichelineExpression(
    `(pair %execute_offer (address %token_contract) (pair (nat %token_id) (address %seller)))`
  )!
);

export const placeOfferSchema = new Schema(
  parser.parseMichelineExpression(
    `(pair %place_offer (address %token_contract)
                   (pair (nat %token_id) (pair (mutez %price) (option %expiration timestamp))))`
  )!
);

export const removeOfferSchema = new Schema(
  parser.parseMichelineExpression(
    `(pair %remove_offer (address %token_contract) (nat %token_id))`
  )!
);

export const OFFER = {
  mainnet: "KT1Evxe1udtPDGWrkiRsEN3vMDdB6gNpkMPM",
  ghostnet: "KT1HavuWyozSXPzbmyUUpU6L92jagMQD28DT",
  name: "Offer",
};

export const tokenTransferSchema = new Schema(
  parser.parseMichelineExpression(`(list %transfer (pair (address %from_)
                     (list %txs (pair (address %to_) (pair (nat %token_id) (nat %amount))))))`)!
);

export const tokenUpdateOperatorsSchema = new Schema(
  parser.parseMichelineExpression(`(list %update_operators (or
                         (pair %add_operator (address %owner)
                                             (pair (address %operator) (nat %token_id)))
                         (pair %remove_operator (address %owner)
                                                (pair (address %operator) (nat %token_id)))))`)!
);

export const TOKEN_CONTRACT = {
  mainnet: "KT1R4KPQxpFHAkX8MKCFmdoiqTaNSSpnJXPL",
  ghostnet: "KT1REqKBXwULnmU6RpZxnRBUgcBmESnXhCWs",
  name: "Tezos Domains NFT",
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
  SET_CHILD_RECORD,
  CHECK_ADDRESS,
  OFFER,
  TOKEN_CONTRACT,
};

export const tezosDomainsContractsMatcher: contracts = {
  mainnet: {
    [CHECK_ADDRESS.mainnet]: true,
    [SET_CHILD_RECORD.mainnet]: true,
    [UPDATE_RECORD.mainnet]: true,
    [CLAIM_REVERSE_RECORD.mainnet]: true,
    [UPDATE_REVERSE_RECORD.mainnet]: true,
    [BUY_ADDRESS.mainnet]: true,
    [RENEW.mainnet]: true,
    [COMMIT_ADDRESS.mainnet]: true,
    [BID.mainnet]: true,
    [WITHDRAW.mainnet]: true,
    [SETTLE.mainnet]: true,
    [OFFER.mainnet]: true,
    KT1GY5qCWwmESfTv9dgjYyTYs2T5XGDSvRp1: true,
    [TOKEN_CONTRACT.mainnet]: true,
    KT1Lu5om8u4ns2VWxcufgQRzjaLLhh3Qvf5B: true,
    KT1VxKQbYBVD8fSkqaewJGigL3tmcLWrsXcu: true,
  },
  ghostnet: {
    [CHECK_ADDRESS.ghostnet]: true,
    [SET_CHILD_RECORD.ghostnet]: true,
    [UPDATE_RECORD.ghostnet]: true,
    [CLAIM_REVERSE_RECORD.ghostnet]: true,
    [UPDATE_REVERSE_RECORD.ghostnet]: true,
    [BUY_ADDRESS.ghostnet]: true,
    [RENEW.ghostnet]: true,
    [COMMIT_ADDRESS.ghostnet]: true,
    [BID.ghostnet]: true,
    [WITHDRAW.ghostnet]: true,
    [SETTLE.ghostnet]: true,
    [OFFER.ghostnet]: true,
    [TOKEN_CONTRACT.ghostnet]: true,
  },
};

const promiseCache: {
  [key: string]: Promise<ReactNode>;
} = {};

function getDomainPromise(
  tokenId: number,
  address: string,
  Tezos: TezosToolkit
) {
  const cacheKey = `${address}:${tokenId}`;

  if (!!promiseCache[cacheKey]) return promiseCache[cacheKey];

  promiseCache[cacheKey] = getTokenMetadata(address, tokenId, Tezos)
    .then(metadata => (
      <a
        href={`https://${
          metadata.name?.endsWith(".gho") ? "ghostnet" : "app"
        }.tezos.domains/domain/${metadata.name}`}
        title="Open domain infos"
        className="underline"
        target="_blank"
        rel="noreferre"
      >
        {metadata.name}
      </a>
    ))
    .catch(_ => {
      return "Failed to fetch domain";
    });

  return promiseCache[cacheKey];
}

function PromiseRendrer({ promise }: { promise: Promise<React.ReactNode> }) {
  const [{ node }, setPromiseState] = useState<{
    isLoading: boolean;
    node: React.ReactNode;
  }>({
    isLoading: true,
    node: null,
  });

  useEffect(() => {
    promise.then(node => {
      setPromiseState({ isLoading: false, node });
    });
  }, [promise]);

  return <>{node ?? "Loading..."}</>;
}

export function tezosDomains(
  transactions: Array<transaction>,
  Tezos: TezosToolkit
): CustomView {
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
    dappName: "Tezos Domains",
    label: transactions
      .flatMap(({ addresses: address }) => {
        if (!address) return [];

        return [
          (() => {
            switch (address) {
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
              case SET_CHILD_RECORD.mainnet:
              case SET_CHILD_RECORD.ghostnet:
                return SET_CHILD_RECORD.name;
              case CHECK_ADDRESS.mainnet:
              case CHECK_ADDRESS.ghostnet:
                return CHECK_ADDRESS.name;
              case OFFER.mainnet:
              case OFFER.ghostnet:
                return OFFER.name;
              case TOKEN_CONTRACT.mainnet:
              case TOKEN_CONTRACT.ghostnet:
                return TOKEN_CONTRACT.name;

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
          if (transaction.entrypoints !== "commit")
            return [
              {
                action: COMMIT_ADDRESS.name,
                description: (
                  <p>
                    {"TzSafe doesn't support the entrypoint:"}
                    {transaction.entrypoints}
                  </p>
                ),
              },
            ];

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
          if (transaction.entrypoints !== "buy")
            return [
              {
                action: BUY_ADDRESS.name,
                description: (
                  <p>
                    {"TzSafe doesn't support the entrypoint:"}
                    {transaction.entrypoints}
                  </p>
                ),
              },
            ];

          const data = buySchema.Execute(micheline);

          const domain = `${bytesToString(data.label)}${
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
                  {!!data.address && (
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
          if (transaction.entrypoints !== "claim_reverse_record")
            return [
              {
                action: CLAIM_REVERSE_RECORD.name,
                description: (
                  <p>
                    {"TzSafe doesn't support the entrypoint:"}
                    {transaction.entrypoints}
                  </p>
                ),
              },
            ];

          const data = claimReverseRecordSchema.Execute(micheline);

          const domain = !!data.name
            ? bytesToString(data.name.Some)
            : undefined;

          return [
            {
              action: CLAIM_REVERSE_RECORD.name,
              description: (
                <ul className="list-inside list-disc space-y-1 pt-1 font-light">
                  <li>
                    Owner: <Alias address={data.owner} />
                  </li>
                  {!!domain && (
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
          if (transaction.entrypoints !== "update_reverse_record")
            return [
              {
                action: UPDATE_REVERSE_RECORD.name,
                description: (
                  <p>
                    {"TzSafe doesn't support the entrypoint:"}
                    {transaction.entrypoints}
                  </p>
                ),
              },
            ];

          const data = updateReverseRecordSchema.Execute(micheline);

          const domain = bytesToString(data.name?.Some ?? "");

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
          if (transaction.entrypoints !== "update_record")
            return [
              {
                action: UPDATE_RECORD.name,
                description: (
                  <p>
                    {"TzSafe doesn't support the entrypoint:"}
                    {transaction.entrypoints}
                  </p>
                ),
              },
            ];

          const data = updateRecordSchema.Execute(micheline);

          const recordName = bytesToString(data.name);

          const parsedData = Array.from(
            (data.data as MichelsonMap<string, string>).entries()
          ).map(([key, value]) => `${key}: ${bytesToString(value)}`);

          return [
            {
              action: UPDATE_RECORD.name,
              description: (
                <ul className="list-inside list-disc space-y-1 pt-1 font-light">
                  <li>Record name: {recordName}</li>
                  <li>
                    Owner: <Alias address={data.owner} />
                  </li>
                  {!!data.address ? (
                    <li>
                      Address: <Alias address={data.address.Some} />
                    </li>
                  ) : null}
                  <li>
                    Settings:
                    {parsedData.length === 0 ? (
                      " Either empty or have been cleared"
                    ) : (
                      <ul
                        className="list-inside list-disc"
                        style={{ marginLeft: "3rem" }}
                      >
                        {parsedData.map(v => (
                          <li key={v}>{v}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                </ul>
              ),
              price,
            },
          ];
        }
        case BID.mainnet:
        case BID.ghostnet: {
          if (transaction.entrypoints !== "bid")
            return [
              {
                action: BID.name,
                description: (
                  <p>
                    {"TzSafe doesn't support the entrypoint:"}
                    {transaction.entrypoints}
                  </p>
                ),
              },
            ];

          const data = bidSchema.Execute(micheline);

          const domain = `${bytesToString(data.label)}${
            transaction.addresses === BID.mainnet ? ".tez" : ".gho"
          }`;

          return [
            {
              action: BID.name,
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
                  <li>Bid: {mutezToTez(data.bid.toNumber())} Tez</li>
                </ul>
              ),
              price,
            },
          ];
        }
        case SETTLE.mainnet:
        case SETTLE.ghostnet: {
          if (transaction.entrypoints !== "settle")
            return [
              {
                action: SETTLE.name,
                description: (
                  <p>
                    {"TzSafe doesn't support the entrypoint:"}
                    {transaction.entrypoints}
                  </p>
                ),
              },
            ];

          const data = settleSchema.Execute(micheline);

          const domain = `${bytesToString(data.label)}${
            transaction.addresses === SETTLE.mainnet ? ".tez" : ".gho"
          }`;

          return [
            {
              action: SETTLE.name,
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
                  {!!data.address ? (
                    <li>
                      Address: <Alias address={data.address.Some} />
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
          if (transaction.entrypoints !== "withdraw")
            return [
              {
                action: WITHDRAW.name,
                description: (
                  <p>
                    {"TzSafe doesn't support the entrypoint:"}
                    {transaction.entrypoints}
                  </p>
                ),
              },
            ];

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
          if (transaction.entrypoints !== "renew")
            return [
              {
                action: RENEW.name,
                description: (
                  <p>
                    {"TzSafe doesn't support the entrypoint:"}
                    {transaction.entrypoints}
                  </p>
                ),
              },
            ];

          const data = renewSchema.Execute(micheline);

          const domain = `${bytesToString(data.label)}${
            transaction.addresses === RENEW.mainnet ? ".tez" : ".gho"
          }`;

          return [
            {
              action: RENEW.name,
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
                    Duration: {data.duration.toString()} day
                    {data.duration.toNumber() <= 1 ? "" : "s"}
                  </li>
                </ul>
              ),
              price,
            },
          ];
        }
        case SET_CHILD_RECORD.mainnet:
        case SET_CHILD_RECORD.ghostnet: {
          if (transaction.entrypoints !== "set_child_record")
            return [
              {
                action: SET_CHILD_RECORD.name,
                description: (
                  <p>
                    {"TzSafe doesn't support the entrypoint:"}
                    {transaction.entrypoints}
                  </p>
                ),
              },
            ];

          const data = setChildRecordSchema.Execute(micheline);

          const domain = `${bytesToString(data.label)}.${bytesToString(
            data.parent
          )}`;
          return [
            {
              action: SET_CHILD_RECORD.name,
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
                      rel="noreferre"
                    >
                      {domain}
                    </a>
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
          if (transaction.entrypoints !== "check_address")
            return [
              {
                action: CHECK_ADDRESS.name,
                description: (
                  <p>
                    {"TzSafe doesn't support the entrypoint:"}
                    {transaction.entrypoints}
                  </p>
                ),
              },
            ];

          const data = checkAddressSchema.Execute(micheline);

          return [
            {
              action: CHECK_ADDRESS.name,
              description: (
                <ul className="list-inside list-disc space-y-1 pt-1 font-light">
                  <li>Name: {bytesToString(data.name)}</li>
                  <li>
                    Address: <Alias address={data.address} />{" "}
                  </li>
                </ul>
              ),
              price,
            },
          ];
        }
        case OFFER.mainnet:
        case OFFER.ghostnet: {
          switch (transaction.entrypoints) {
            case "execute_offer": {
              const data = executeOfferSchema.Execute(micheline);

              const promise = getDomainPromise(
                data.token_id.toNumber(),
                data.token_contract,
                Tezos
              );

              return [
                {
                  action: "Execute offer",
                  description: (
                    <ul className="list-inside list-disc space-y-1 pt-1 font-light">
                      <li>
                        Seller: <Alias address={data.seller} />
                      </li>
                      <li>
                        Domain: <PromiseRendrer promise={promise} />
                      </li>
                    </ul>
                  ),
                  price,
                },
              ];
            }
            case "place_offer": {
              const data = placeOfferSchema.Execute(micheline);

              const promise = getDomainPromise(
                data.token_id.toNumber(),
                data.token_contract,
                Tezos
              );

              return [
                {
                  action: "Place offer",
                  description: (
                    <ul className="list-inside list-disc space-y-1 pt-1 font-light">
                      <li>
                        Domain: <PromiseRendrer promise={promise} />
                      </li>
                      <li>Price: {mutezToTez(data.price.toNumber())} Tez</li>
                      {!!data.expiration ? (
                        <li>
                          Expiration date:{" "}
                          {new Date(data.expiration.Some).toLocaleString()}
                        </li>
                      ) : null}
                    </ul>
                  ),
                  price,
                },
              ];
            }
            case "remove_offer": {
              const data = removeOfferSchema.Execute(micheline);

              const promise = getDomainPromise(
                data.token_id.toNumber(),
                data.token_contract,
                Tezos
              );

              return [
                {
                  action: "Remove offer",
                  description: (
                    <ul className="list-inside list-disc space-y-1 pt-1 font-light">
                      <li>
                        Domain: <PromiseRendrer promise={promise} />
                      </li>
                    </ul>
                  ),
                  price,
                },
              ];
            }
            default:
              return [
                {
                  action: "Internal",
                  description: (
                    <p>
                      {"TzSafe doesn't support the entrypoint:"}
                      {transaction.entrypoints}
                    </p>
                  ),
                },
              ];
          }
        }
        case TOKEN_CONTRACT.ghostnet:
        case TOKEN_CONTRACT.mainnet: {
          switch (transaction.entrypoints) {
            case "transfer": {
              const data = tokenTransferSchema.Execute(micheline) as Array<{
                from_: string;
                txs: Array<{
                  to_: string;
                  token_id: BigNumber;
                  amount: BigNumber;
                }>;
              }>;

              if (data.length !== 1 || data[0].txs.length !== 1)
                return [
                  {
                    action: "Domain transfer",
                    description: "TzSafe only supports 1 domain transfer",
                  },
                ];

              const tokenId = data[0].txs[0].token_id;

              const promise = getDomainPromise(
                tokenId.toNumber(),
                transaction.addresses,
                Tezos
              );

              return [
                {
                  action: "Domain transfer",
                  description: (
                    <ul className="list-inside list-disc space-y-1 pt-1 font-light">
                      <li>
                        From: <Alias address={data[0].from_} />
                      </li>
                      <li>
                        To: <Alias address={data[0].txs[0].to_} />
                      </li>
                      <li>
                        Domain: <PromiseRendrer promise={promise} />
                      </li>
                    </ul>
                  ),
                  price,
                },
              ];
            }
            case "update_operators": {
              const data = tokenUpdateOperatorsSchema.Execute(
                micheline
              ) as Array<
                | {
                    add_operator: {
                      owner: string;
                      operator: string;
                      token_id: BigNumber;
                    };
                  }
                | {
                    remove_operator: {
                      owner: string;
                      operator: string;
                      token_id: BigNumber;
                    };
                  }
              >;

              return [
                {
                  action: "Update operators",
                  description: data.map((operation, i) => {
                    const data =
                      "add_operator" in operation
                        ? operation.add_operator
                        : operation.remove_operator;

                    const promise = getDomainPromise(
                      data.token_id.toNumber(),
                      transaction.addresses!,
                      Tezos
                    );

                    return (
                      <section className={i > 0 ? "mt-2" : ""} key={i}>
                        <h4>
                          {"add_operator" in operation
                            ? "Add operator"
                            : "Remove operator"}
                        </h4>
                        <ul className="list-inside list-disc space-y-1 pt-1 font-light">
                          <li>
                            Domain: <PromiseRendrer promise={promise} />
                          </li>
                          <li>
                            Owner : <Alias address={data.owner} />
                          </li>
                          <li>
                            Operator : <Alias address={data.operator} />
                          </li>
                        </ul>
                      </section>
                    );
                  }),

                  price,
                },
              ];
            }

            default:
              return [
                {
                  action: "Domain",
                  description: (
                    <p>
                      {"TzSafe doesn't support the entrypoint:"}
                      {transaction.entrypoints}
                    </p>
                  ),
                },
              ];
          }
        }

        default:
          return [];
      }
    }),
  };
}
