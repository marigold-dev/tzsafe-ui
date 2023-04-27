export const makeUndelegateMichelson = () => `{ 
  DROP ;
  NONE key_hash ;
  SET_DELEGATE ;
}`;
export const makeDelegateMichelson = ({
  bakerAddress,
}: {
  bakerAddress: string;
}) => `DROP ;
PUSH key_hash ${bakerAddress} ;
SOME ;
SET_DELEGATE ;`;
