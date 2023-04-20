type makeContractExecutionParam = {
  address: string;
  entrypoint: string;
  type: string;
  amount: number;
  param: string;
};

export const makeContractExecution = ({
  address,
  entrypoint,
  type,
  amount,
  param,
}: makeContractExecutionParam) => `{
      DROP;
      PUSH address "${address}";
      CONTRACT %${entrypoint} ${type};
      IF_NONE { PUSH string "contract dosen't exist"; FAILWITH } { };
      PUSH mutez ${amount};
      PUSH ${type} ${param} ;
      TRANSFER_TOKENS
  }`;
