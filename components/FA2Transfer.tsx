import { Field, FieldProps } from "formik";
import Image from "next/image";
import { useContext, useEffect, useState } from "react";
import { API_URL, THUMBNAIL_URL } from "../context/config";
import { AppStateContext } from "../context/state";
import Alias from "./Alias";
import Autocomplete from "./Autocomplete";

type props = {
  name: string;
  value: string;
  setFieldValue: (name: string, value: any) => void;
  placeholder?: string;
};

type fa2Token = {
  id: number;
  account: {
    address: string;
  };
  token: {
    id: number;
    contract: { address: string };
    metadata: { name: string; symbol: string; thumbnailUri: string };
    standard: string;
    tokenId: string;
    totalSupply: string;
  };
};

type option = {
  id: string;
  value: string;
  name: string;
  tokenId: string;
  thumbnailHash: string;
  contractAddress: string;
};

const FA2Input = ({ name, setFieldValue, placeholder, value }: props) => {
  const state = useContext(AppStateContext)!;

  const [isFetching, setIsFetching] = useState(true);
  const [fa2Tokens, setFa2Tokens] = useState<fa2Token[]>([]);
  const [currentToken, setCurrentToken] = useState<fa2Token | undefined>();
  const [options, setOptions] = useState<option[]>([]);

  useEffect(() => {
    setIsFetching(true);
    fetch(
      `${API_URL}/v1/tokens/balances?account=${state.currentContract}&token.metadata.name.as=*`
    )
      .then(res => res.json())
      .then((v: fa2Token[]) => {
        setFa2Tokens(v);
        setOptions(
          v.map(({ token }) => ({
            id: token.id.toString(),
            tokenId: token.tokenId,
            value: token.id.toString(),
            name: token.metadata.name,
            thumbnailHash: token.metadata.thumbnailUri.replace("ipfs://", ""),
            contractAddress: token.contract.address,
          }))
        );
        setIsFetching(false);
      });
  }, [state.currentContract]);

  console.log(fa2Tokens);
  return (
    <Autocomplete
      label=""
      onChange={newValue => {
        setFieldValue(name, newValue);
      }}
      value={value}
      options={options}
      placeholder={placeholder}
      loading={isFetching}
      renderOption={({
        thumbnailHash,
        value,
        tokenId,
        contractAddress,
        name,
      }) => {
        return (
          <div className="flex items-center space-x-2">
            <div className="w-1/5 overflow-hidden rounded">
              <img
                src={`${THUMBNAIL_URL}/${thumbnailHash}`}
                alt={name}
                className="h-auto w-full"
              />
            </div>
            <span className="text-xs text-zinc-400">#{tokenId}</span>
            <p className="w-4/5 truncate text-xs" title={name}>
              {name}
            </p>
            <Alias
              address={contractAddress}
              className="text-xs text-zinc-400"
              disabled
            />
          </div>
        );
      }}
    />
  );
};

export default FA2Input;
