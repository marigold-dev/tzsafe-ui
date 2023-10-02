import { version } from "../types/display";

export type makeFa2MichelsonParam = {
  walletAddress: string;
  targetAddress: string;
  tokenId: number;
  amount: number;
  fa2Address: string;
};

export type makeFa1_2MichelsonParam = {
  amount: number;
  fa1_2Address: string;
};

export type approve = makeFa1_2MichelsonParam & {
  spenderAddress: string;
};

export type transfer = makeFa1_2MichelsonParam & {
  walletAddress: string;
  targetAddress: string;
};

export type makeContractExecutionParam = {
  address: string;
  entrypoint: string;
  type: string;
  amount: number;
  param: string;
};

export function generateFA2Michelson(
  version: version,
  params: makeFa2MichelsonParam[]
) {
  if (params.length === 0) throw new Error("Empty fa2 params");

  if (version === "0.3.1") {
    return `{
        DROP;
        NIL operation ;
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
        TRANSFER_TOKENS ;
        CONS ;
      }`;
  } else if (version !== "unknown version") {
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
        TRANSFER_TOKENS ;
      }`;
  }

  throw new Error("Can't generate for an unknow version");
}

export function generateFA1_2ApproveMichelson(
  version: version,
  { spenderAddress, amount, fa1_2Address }: approve
) {
  if (version === "0.3.1") {
    return `{ 
        DROP ;
        NIL operation ;
        PUSH address "${fa1_2Address}" ;
        CONTRACT %approve (pair (address :spender) (nat :value)) ;
        IF_NONE { PUSH string "contract dosen't exist" ; FAILWITH } { } ;
        PUSH mutez 0 ;
        PUSH (pair (address :spender) (nat :value)) (Pair "${spenderAddress}" ${amount}) ;
        TRANSFER_TOKENS ;
        CONS ;
    }`;
  } else if (version !== "unknown version") {
    return `{ 
        DROP ;
        PUSH address "${fa1_2Address}" ;
        CONTRACT %approve (pair (address :spender) (nat :value)) ;
        IF_NONE { PUSH string "contract dosen't exist" ; FAILWITH } { } ;
        PUSH mutez 0 ;
        PUSH (pair (address :spender) (nat :value)) (Pair "${spenderAddress}" ${amount}) ;
        TRANSFER_TOKENS ;
    }`;
  }

  throw new Error("Can't generate for an unknow version");
}

export function generateFA1_2TransferMichelson(
  version: version,
  { walletAddress, targetAddress, amount, fa1_2Address }: transfer
) {
  if (version === "0.3.1") {
    return `{ 
          DROP ;
          NIL operation ;
          PUSH address "${fa1_2Address}" ;
          CONTRACT %transfer (pair (address :from) (pair (address :to) (nat :amount))) ;
          IF_NONE { PUSH string "contract dosen't exist" ; FAILWITH } { } ;
          PUSH mutez 0 ;
          PUSH  (pair (address :from) (pair (address :to) (nat :amount))) (Pair "${walletAddress}" (Pair "${targetAddress}" ${amount})) ;
          TRANSFER_TOKENS ;
          CONS ;
      }`;
  } else if (version !== "unknown version") {
    return `{ 
          DROP ;
          PUSH address "${fa1_2Address}" ;
          CONTRACT %transfer (pair (address :from) (pair (address :to) (nat :amount))) ;
          IF_NONE { PUSH string "contract dosen't exist" ; FAILWITH } { } ;
          PUSH mutez 0 ;
          PUSH  (pair (address :from) (pair (address :to) (nat :amount))) (Pair "${walletAddress}" (Pair "${targetAddress}" ${amount})) ;
          TRANSFER_TOKENS ;
      }`;
  }

  throw new Error("Can't generate for an unknow version");
}

export function generateExecuteContractMichelson(
  version: version,
  { address, entrypoint, type, amount, param }: makeContractExecutionParam
) {
  let michelsonEntrypoint = "";
  if (entrypoint !== "default") {
    michelsonEntrypoint = `%${entrypoint}`;
  }

  if (version === "0.3.1") {
    return `{
          DROP;
          NIL operation ;
          PUSH address "${address}";
          CONTRACT ${michelsonEntrypoint} ${type};
          IF_NONE { PUSH string "contract dosen't exist"; FAILWITH } { };
          PUSH mutez ${amount};
          PUSH ${type} ${param} ;
          TRANSFER_TOKENS ;
          CONS ;
      }`;
  } else if (version !== "unknown version") {
    return `{
          DROP;
          PUSH address "${address}";
          CONTRACT ${michelsonEntrypoint} ${type};
          IF_NONE { PUSH string "contract dosen't exist"; FAILWITH } { };
          PUSH mutez ${amount};
          PUSH ${type} ${param} ;
          TRANSFER_TOKENS ;
      }`;
  }

  throw new Error("Can't generate for an unknow version");
}

export function generateDelegateMichelson(
  version: version,
  { bakerAddress }: { bakerAddress: string }
) {
  if (version === "0.3.1") {
    return `{
        DROP ;
        NIL operation ;
        PUSH key_hash "${bakerAddress}" ;
        SOME ;
        SET_DELEGATE ;
        CONS ;
      }`;
  } else if (version !== "unknown version") {
    return `{
        DROP ;
        PUSH key_hash "${bakerAddress}" ;
        SOME ;
        SET_DELEGATE ;
      }`;
  }

  throw new Error("Can't generate for an unknow version");
}

export function generateUndelegateMichelson(version: version) {
  if (version === "0.3.1") {
    return `{
        DROP ;
        NIL operation ;
        NONE key_hash ;
        SET_DELEGATE ;
        CONS ;
      }`;
  } else if (version !== "unknown version") {
    return `{
        DROP ;
        NONE key_hash ;
        SET_DELEGATE ;
      }`;
  }

  throw new Error("Can't generate for an unknow version");
}
