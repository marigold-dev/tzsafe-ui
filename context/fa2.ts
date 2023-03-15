type makeFa2MichelsonParam = {
  walletAddress: string;
  targetAddress: string;
  tokenId: number;
  amount: number;
  fa2Address: string;
};

export const makeFa2Michelson = ({
  walletAddress,
  targetAddress,
  tokenId,
  amount,
  fa2Address,
}: makeFa2MichelsonParam) => `{
    DROP;
    PUSH address "${fa2Address}";
    CONTRACT %transfer (list (pair (address %from_) (list %txs (pair (address %to_) (pair (nat %token_id) (nat %amount))))));
    IF_NONE { PUSH string "contract dosen't exist" ; FAILWITH } { } ;
    PUSH mutez 0 ;
    PUSH (list (pair (address %from_) (list %txs (pair (address %to_) (pair (nat %token_id) (nat %amount)))))) {Pair "${walletAddress}" {Pair "${targetAddress}" (Pair ${tokenId} ${amount})}} ;
    TRANSFER_TOKENS
}`;
