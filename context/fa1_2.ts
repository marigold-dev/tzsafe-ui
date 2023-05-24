type makeFa1_2MichelsonParam = {
  amount: number;
  fa1_2Address: string;
};

type approve = makeFa1_2MichelsonParam & {
  spenderAddress: string;
};

type transfer = makeFa1_2MichelsonParam & {
  walletAddress: string;
  targetAddress: string;
};

export const makeFa1_2ApproveMichelson = ({
  spenderAddress,
  amount,
  fa1_2Address,
}: approve) => `{ 
    DROP ;
    PUSH address "${fa1_2Address}" ;
    CONTRACT %approve (pair (address :spender) (nat :value)) ;
    IF_NONE { PUSH string "contract dosen't exist" ; FAILWITH } { } ;
    PUSH mutez 0 ;
    PUSH (pair (address :spender) (nat :value)) (pair "${spenderAddress}" ${amount}) ;
    TRANSFER_TOKENS
}`;

export const makeFa1_2TransferMichelson = ({
  walletAddress,
  targetAddress,
  amount,
  fa1_2Address,
}: transfer) => `{ 
    DROP ;
    PUSH address "${fa1_2Address}" ;
    CONTRACT %transfer (pair (address :from) (pair (address :to) (nat :amount))) ;
    IF_NONE { PUSH string "contract dosen't exist" ; FAILWITH } { } ;
    PUSH mutez 0 ;
    PUSH  (pair (address :from) (pair (address :to) (nat :amount))) (pair "${walletAddress}" (pair "${targetAddress}" ${amount})) ;
    TRANSFER_TOKENS
}`;
