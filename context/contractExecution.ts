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
}: makeContractExecutionParam) => {
  let michelson_entrypoint = "";
  if (entrypoint !== "default") {
    michelson_entrypoint = `%${entrypoint}`;
  }
  return `{
      DROP;
      NIL operation ;
      PUSH address "${address}";
      CONTRACT ${michelson_entrypoint} ${type};
      IF_NONE { PUSH string "contract dosen't exist"; FAILWITH } { };
      PUSH mutez ${amount};
      PUSH ${type} ${param} ;
      TRANSFER_TOKENS ;
      CONS ;
  }`;
};
