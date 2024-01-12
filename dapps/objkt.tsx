import { Parser } from "@taquito/michel-codec";
import { Schema } from "@taquito/michelson-encoder";
import { contracts, CustomViewData, CustomView } from ".";
import logo from "../assets/images/objkt.png";
import { transaction } from "../components/RenderProposalContentLambda";
import { mutezToTez } from "../utils/tez";

const parser = new Parser();

function makeNftImageUrl(contract: string, id: string) {
  return `https://assets.objkt.media/file/assets-003/${contract}/${id}/thumb288`;
}

export const MARKETPLACE_V4 = {
  mainnet: "KT1WvzYHCNBvDSdwafTHv7nJ1dWmZ8GCYuuC",
  ghostnet: "KT1AiEcg7D2Jm9GKDgguVLBwRPjzjkkPpwds",
  name: "Marketplace",
};

export const askSchema = new Schema(
  parser.parseMichelineExpression(
    `(pair %ask (pair %token (address %address) (nat %token_id))
           (pair
             (or %currency (address %fa12)
                           (or (pair %fa2 (address %address) (nat %token_id)) (unit %tez)))
             (pair (nat %amount)
                   (pair (nat %editions)
                         (pair (list %shares (pair (nat %amount) (address %recipient)))
                               (pair (option %expiry_time timestamp) (option %target address)))))))`
  )!
);

export const fulfilAskSchema = new Schema(
  parser.parseMichelineExpression(
    `(pair %fulfill_ask (nat %ask_id) (option %proxy address))`
  )!
);

export const fulfilOfferSchema = new Schema(
  parser.parseMichelineExpression(
    `(pair %fulfill_offer (nat %offer_id) (option %token_id nat))`
  )!
);

export const offerSchema = new Schema(
  parser.parseMichelineExpression(
    `(pair %offer (pair %token (address %address) (option %token_id nat))
             (pair
               (or %currency (address %fa12)
                             (or (pair %fa2 (address %address) (nat %token_id)) (unit %tez)))
               (pair (nat %amount)
                     (pair (list %shares (pair (nat %amount) (address %recipient)))
                           (pair (option %expiry_time timestamp)
                                 (pair (option %target address) (option %proxy address)))))))`
  )!
);

export const retractAskSchema = new Schema(
  parser.parseMichelineExpression(`(nat %retract_ask)`)!
);

export const retractOfferSchema = new Schema(
  parser.parseMichelineExpression(`(nat %retract_offer)`)!
);

export const ENGLISH_AUCTION_V4 = {
  mainnet: "KT18p94vjkkHYY3nPmernmgVR7HdZFzE7NAk",
  ghostnet: "KT19doPp2S8SpFWhTvVhh8MuZ49vVZ5Cd5ZH",
  name: "English auction",
};

export const englishBidSchema = new Schema(
  parser.parseMichelineExpression(
    `(pair %bid (nat %auction_id) (nat %amount))`
  )!
);
export const englishCancelAuctionSchema = new Schema(
  parser.parseMichelineExpression(`(nat %cancel_auction)`)!
);
export const englishCreateAuctionSchema = new Schema(
  parser.parseMichelineExpression(`(pair %create_auction (pair %token (address %address) (nat %token_id))
    (pair
      (or %currency (address %fa12)
                    (or (pair %fa2 (address %address) (nat %token_id)) (unit %tez)))
      (pair (nat %reserve)
            (pair (timestamp %start_time)
                  (pair (timestamp %end_time)
                        (pair (nat %extension_time)
                              (pair (nat %price_increment)
                                    (list %shares (pair (nat %amount)
                                                      (address %recipient))))))))))`)!
);
export const settleAuctionSchema = new Schema(
  parser.parseMichelineExpression(`(nat %settle_auction)`)!
);

export const DUTCH_AUCTION_V4 = {
  mainnet: "KT1XXu88HkNzQRHNgAf7Mnq68LyS9MZJNoHP",
  ghostnet: "KT18gCSfQZQHEu8pkzkkxuTLiE8ZAVUc1kSe",
  name: "Dutch auction",
};

export const dutchBuySchema = new Schema(
  parser.parseMichelineExpression(
    `(pair %buy (nat %auction_id) (pair (nat %amount) (option %proxy address)))`
  )!
);

export const dutchCancelAuctionSchema = new Schema(
  parser.parseMichelineExpression(`(nat %cancel_auction)`)!
);
export const dutchCreateAuctionSchema = new Schema(
  parser.parseMichelineExpression(`(pair %create_auction (pair %token (address %address) (nat %token_id))
    (pair
      (or %currency (address %fa12)
                    (or (pair %fa2 (address %address) (nat %token_id)) (unit %tez)))
      (pair (nat %editions)
            (pair (timestamp %start_time)
                  (pair (timestamp %end_time)
                        (pair (nat %start_price)
                              (pair (nat %end_price)
                                    (list %shares (pair (nat %amount)
                                                        (address %recipient))))))))))`)!
);

export const objktContracts = {
  MARKETPLACE_V4,
  ENGLISH_AUCTION_V4,
  DUTCH_AUCTION_V4,
};

export const objktContractsMatcher: contracts = {
  mainnet: {
    [MARKETPLACE_V4.mainnet]: true,
    [ENGLISH_AUCTION_V4.mainnet]: true,
    [DUTCH_AUCTION_V4.mainnet]: true,
  },
  ghostnet: {
    [MARKETPLACE_V4.ghostnet]: true,
    [ENGLISH_AUCTION_V4.ghostnet]: true,
    [DUTCH_AUCTION_V4.ghostnet]: true,
  },
};

export function objkt(transactions: Array<transaction>): CustomView {
  if (
    !transactions.every(
      ({ addresses }) =>
        !!addresses &&
        (objktContractsMatcher.mainnet[addresses] ||
          objktContractsMatcher.ghostnet[addresses])
    )
  )
    return undefined;

  return {
    logo: logo.src,
    logoLink: "https://objkt.com/",
    logoAlt: "Objkt",
    label: transactions
      .flatMap(({ addresses }) => {
        if (!addresses) return [];

        return [
          (() => {
            switch (addresses) {
              case MARKETPLACE_V4.mainnet:
              case MARKETPLACE_V4.ghostnet:
                return MARKETPLACE_V4.name;
              case ENGLISH_AUCTION_V4.mainnet:
              case ENGLISH_AUCTION_V4.ghostnet:
                return ENGLISH_AUCTION_V4.name;
              case DUTCH_AUCTION_V4.mainnet:
              case DUTCH_AUCTION_V4.ghostnet:
                return DUTCH_AUCTION_V4.name;
              default:
                return "Interaction with Objkt";
            }
          })(),
        ];
      })
      .join(", "),
    data: transactions.flatMap<CustomViewData>(transaction => {
      if (!transaction.params || !transaction.entrypoints) return [];

      const price = transaction.amount;
      const micheline = parser.parseMichelineExpression(transaction.params);

      if (!micheline) return [];

      switch (transaction.addresses) {
        case MARKETPLACE_V4.mainnet:
        case MARKETPLACE_V4.ghostnet: {
          switch (transaction.entrypoints) {
            case "ask": {
              const data = askSchema.Execute(micheline);

              const unit = "tez" in data.currency ? "Tez" : "";

              return [
                {
                  image: makeNftImageUrl(
                    data.token.address,
                    data.token.token_id.toString()
                  ),
                  action: "Ask",
                  description: (
                    <ul className="list-inside list-disc space-y-1 pt-1 font-light">
                      <li>
                        Price: {mutezToTez(data.amount.toNumber())} {unit}
                      </li>
                      {!!data.expiry_time ? (
                        <li>
                          Expiration date:{" "}
                          {new Date(data.expiry_time).toLocaleString()}
                        </li>
                      ) : null}
                    </ul>
                  ),
                  price,
                },
              ];
            }
            case "offer": {
              const data = offerSchema.Execute(micheline);

              const unit = "tez" in data.currency ? "Tez" : "";

              return [
                {
                  image: !!data.token.token_id.Some
                    ? makeNftImageUrl(
                        data.token.address,
                        data.token.token_id.Some.toString()
                      )
                    : undefined,
                  action: "Offer",
                  description: (
                    <ul className="list-inside list-disc space-y-1 pt-1 font-light">
                      <li>
                        Price: {mutezToTez(data.amount)} {unit}
                      </li>
                      {!!data.expiry_time ? (
                        <li>
                          Expiration date:{" "}
                          {new Date(data.expiry_time).toLocaleString()}
                        </li>
                      ) : null}
                    </ul>
                  ),
                  price,
                },
              ];
            }
            case "fulfill_ask": {
              const data = fulfilAskSchema.Execute(micheline);

              return [
                {
                  action: "Fulfill ask",
                  description: (
                    <ul className="list-inside list-disc space-y-1 pt-1 font-light">
                      <li>Ask id: {data.ask_id.toString()}</li>
                    </ul>
                  ),
                  price,
                },
              ];
            }
            case "fulfill_offer": {
              const data = fulfilOfferSchema.Execute(micheline);

              return [
                {
                  action: "Fulfill offer",
                  description: (
                    <ul className="list-inside list-disc space-y-1 pt-1 font-light">
                      <li>Offer id: {data.offer_id.toString()}</li>
                    </ul>
                  ),
                  price,
                },
              ];
            }
            case "retract_ask": {
              const data = retractAskSchema.Execute(micheline);

              return [
                {
                  action: "Retract ask",
                  description: (
                    <ul className="list-inside list-disc space-y-1 pt-1 font-light">
                      <li>Ask id: {data.toString()}</li>
                    </ul>
                  ),
                  price,
                },
              ];
            }
            case "retract_offer": {
              const data = retractOfferSchema.Execute(micheline);

              return [
                {
                  action: "Retract offer",
                  description: (
                    <ul className="list-inside list-disc space-y-1 pt-1 font-light">
                      <li>Ask id: {data.toString()}</li>
                    </ul>
                  ),
                  price,
                },
              ];
            }

            default:
              return [];
          }
        }
        case ENGLISH_AUCTION_V4.mainnet:
        case ENGLISH_AUCTION_V4.ghostnet: {
          switch (transaction.entrypoints) {
            case "bid": {
              const data = englishBidSchema.Execute(micheline);

              return [
                {
                  action: "Bid",
                  description: (
                    <ul className="list-inside list-disc space-y-1 pt-1 font-light">
                      <li>Auction id: {data.auction_id.toString()}</li>
                      <li>Amount: {mutezToTez(data.amount.toNumber())} Tez</li>
                    </ul>
                  ),
                  price,
                },
              ];
            }
            case "create_auction": {
              const data = englishCreateAuctionSchema.Execute(micheline);

              const unit = "tez" in data.currency ? "Tez" : "";

              return [
                {
                  image: makeNftImageUrl(
                    data.token.address,
                    data.token.token_id.toString()
                  ),
                  action: "Create english auction",
                  description: (
                    <ul className="list-inside list-disc space-y-1 pt-1 font-light">
                      <li>
                        Reserve price: {mutezToTez(data.reserve.toNumber())}{" "}
                        {unit}
                      </li>
                      <li>
                        Price increment:{" "}
                        {mutezToTez(data.price_increment.toNumber())} {unit}
                      </li>
                      <li>
                        Start time: {new Date(data.start_time).toLocaleString()}
                      </li>
                      <li>
                        End time: {new Date(data.end_time).toLocaleString()}
                      </li>
                      <li>Extension time: {data.extension_time.toString()}</li>
                    </ul>
                  ),
                  price,
                },
              ];
            }
            case "cancel_auction": {
              const data = englishCancelAuctionSchema.Execute(micheline);

              return [
                {
                  action: "Cancel english auction",
                  description: (
                    <ul className="list-inside list-disc space-y-1 pt-1 font-light">
                      <li>Auction id: {data.toString()}</li>
                    </ul>
                  ),
                  price,
                },
              ];
            }
            case "settle_auction": {
              const data = englishCancelAuctionSchema.Execute(micheline);

              return [
                {
                  action: "Settle english auction",
                  description: (
                    <ul className="list-inside list-disc space-y-1 pt-1 font-light">
                      <li>Auction id: {data.toString()}</li>
                    </ul>
                  ),
                  price,
                },
              ];
            }
            default:
              [];
          }
        }
        case DUTCH_AUCTION_V4.ghostnet:
        case DUTCH_AUCTION_V4.mainnet: {
          switch (transaction.entrypoints) {
            case "buy": {
              const data = englishBidSchema.Execute(micheline);

              return [
                {
                  action: "Buy",
                  description: (
                    <ul className="list-inside list-disc space-y-1 pt-1 font-light">
                      <li>Auction id: {data.auction_id.toString()}</li>
                      <li>Amount: {mutezToTez(data.amount.toNumber())}</li>
                    </ul>
                  ),
                  price,
                },
              ];
            }
            case "create_auction": {
              const data = dutchCreateAuctionSchema.Execute(micheline);

              const unit = "tez" in data.currency ? "Tez" : "";

              return [
                {
                  image: makeNftImageUrl(
                    data.token.address,
                    data.token.token_id.toString()
                  ),
                  action: "Create dutch auction",
                  description: (
                    <ul className="list-inside list-disc space-y-1 pt-1 font-light">
                      <li>
                        Start price: {mutezToTez(data.start_price.toNumber())}{" "}
                        {unit}
                      </li>
                      <li>
                        End price: {mutezToTez(data.end_price.toNumber())}{" "}
                        {unit}
                      </li>
                      <li>
                        Start time: {new Date(data.start_time).toLocaleString()}
                      </li>
                      <li>
                        End time: {new Date(data.end_time).toLocaleString()}
                      </li>
                    </ul>
                  ),
                  price,
                },
              ];
            }
            case "cancel_auction": {
              const data = englishCancelAuctionSchema.Execute(micheline);

              return [
                {
                  action: "Cancel dutch auction",
                  description: (
                    <ul className="list-inside list-disc space-y-1 pt-1 font-light">
                      <li>Auction id: {data.toString()}</li>
                    </ul>
                  ),
                  price,
                },
              ];
            }
            default:
              [];
          }
        }
        default:
          return [];
      }
    }),
  };
}
