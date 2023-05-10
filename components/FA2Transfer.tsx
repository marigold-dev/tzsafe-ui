import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { API_URL, THUMBNAIL_URL } from "../context/config";
import { AppStateContext } from "../context/state";
import { debounce } from "../utils/timeout";
import Alias from "./Alias";
import Autocomplete from "./Autocomplete";

type props = {
  name: string;
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
  label: string;
  tokenId: string;
  thumbnailHash: string | undefined;
  contractAddress: string;
};

const FETCH_COUNT = 20;

const FA2Input = ({ name, setFieldValue, placeholder }: props) => {
  const state = useContext(AppStateContext)!;
  const [value, setValue] = useState("");

  const [isFetching, setIsFetching] = useState(true);
  const [canSeeMore, setCanSeeMore] = useState(true);

  const [fa2Tokens, setFa2Tokens] = useState<fa2Token[]>([]);
  const [currentToken, setCurrentToken] = useState<fa2Token | undefined>();
  const [options, setOptions] = useState<option[]>([]);
  const fetchOffsetRef = useRef(0);

  const fetchTokens = useCallback(
    (value: string, offset: number) =>
      fetch(
        `${API_URL}/v1/tokens/balances?account=${state.currentContract}&offset=${offset}&limit=20&token.metadata.name.as=*${value}*`
      )
        .then(res => res.json())
        .then((v: fa2Token[]) => {
          if (v.length < FETCH_COUNT) setCanSeeMore(false);

          return Promise.resolve(v);
        }),
    [state.currentContract]
  );

  useEffect(() => {
    setIsFetching(true);

    debounce(
      () =>
        fetchTokens(value, 0).then((v: fa2Token[]) => {
          setFa2Tokens(v);
          setOptions(
            v.map(({ token }) => ({
              id: token.id.toString(),
              tokenId: token.tokenId,
              value: token.id.toString(),
              label: token.metadata.name,
              thumbnailHash: token.metadata.thumbnailUri.replace("ipfs://", ""),
              contractAddress: token.contract.address,
            }))
          );
          setIsFetching(false);
        }),
      150
    );
  }, [fetchTokens, value]);

  return (
    <Autocomplete
      label=""
      withSeeMore={canSeeMore}
      onSeeMore={() => {
        fetchOffsetRef.current += 20;

        fetchTokens(value, fetchOffsetRef.current).then((v: fa2Token[]) => {
          setFa2Tokens(current => current.concat(v));
          setOptions(current =>
            current.concat(
              v.map(({ token }) => ({
                id: token.id.toString(),
                tokenId: token.tokenId,
                value: token.id.toString(),
                label: token.metadata.name,
                thumbnailHash: token.metadata.thumbnailUri.replace(
                  "ipfs://",
                  ""
                ),
                contractAddress: token.contract.address,
              }))
            )
          );
        });
      }}
      onChange={newValue => {
        const parsedValue = Number(newValue);
        const currentToken = fa2Tokens.find(
          ({ token: { id } }) => id === parsedValue
        );

        if (isNaN(parsedValue) || !currentToken) {
          setValue(newValue);
        } else {
          setCurrentToken(currentToken);
          setFieldValue(name, currentToken);
          setValue(currentToken.token.metadata.name);
        }
      }}
      value={value}
      options={options}
      placeholder={placeholder}
      loading={isFetching}
      renderOption={({ thumbnailHash, tokenId, contractAddress, label }) => {
        return (
          <div>
            <div className="flex w-full items-center justify-between">
              <span className="text-xs text-zinc-400">#{tokenId}</span>

              <Alias
                address={contractAddress}
                className="text-xs text-zinc-400"
                disabled
              />
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-1/6 overflow-hidden rounded">
                {!!thumbnailHash && (
                  <img
                    src={`${THUMBNAIL_URL}/${thumbnailHash}`}
                    alt={label}
                    className="h-auto w-full"
                  />
                )}
              </div>
              <p className="w-4/5 text-xs" title={label}>
                {label}
              </p>
            </div>
          </div>
        );
      }}
    />
  );
};

export default FA2Input;
