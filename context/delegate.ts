export const makeUndelegateMichelson = () => `{ 
  DROP ;
  NIL operation ;
  NONE key_hash ;
  SET_DELEGATE ;
  CONS ;
}`;
export const makeDelegateMichelson = ({
  bakerAddress,
}: {
  bakerAddress: string;
}) => `{
  DROP ;
  NIL operation ;
  PUSH key_hash "${bakerAddress}" ;
  SOME ;
  SET_DELEGATE ;
  CONS ;
}`;
