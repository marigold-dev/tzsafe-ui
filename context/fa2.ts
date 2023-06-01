import { Parser } from "@taquito/michel-codec";

type makeFa2MichelsonParam = {
  walletAddress: string;
  targetAddress: string;
  tokenId: number;
  amount: number;
  fa2Address: string;
};

export const makeFa2Michelson = (params: makeFa2MichelsonParam[]) => {
  if (params.length === 0) throw new Error("Empty fa2 params");

  return `{
    DROP;
    PUSH address "${params[0].fa2Address}";
    CONTRACT %transfer (list (pair (address %from_) (list %txs (pair (address %to_) (pair (nat %token_id) (nat %amount))))));
    IF_NONE { PUSH string "contract dosen't exist" ; FAILWITH } { } ;
    PUSH mutez 0 ;
    PUSH (list (pair (address %from_) (list %txs (pair (address %to_) (pair (nat %token_id) (nat %amount)))))) {Pair "${
      params[0].walletAddress
    }" {
      ${params
        .map(
          ({ targetAddress, tokenId, amount }) =>
            `Pair "${targetAddress}" (Pair ${tokenId} ${amount}) ;`
        )
        .join("\n")}
      
    } };
    TRANSFER_TOKENS
  }`;
};
