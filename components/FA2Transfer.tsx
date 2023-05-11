import { validateAddress, ValidationResult } from "@taquito/utils";
import { ErrorMessage, Field, FieldInputProps } from "formik";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { API_URL, THUMBNAIL_URL } from "../context/config";
import { AppStateContext } from "../context/state";
import { debounce } from "../utils/timeout";
import Alias from "./Alias";
import Autocomplete from "./Autocomplete";
import renderError from "./formUtils";

type props = {
  index: number;
  remove: (index: number) => void;
  setFieldValue: (name: string, value: any) => void;
  getFieldProps: (name: string) => FieldInputProps<any>;
};

type fa2Token = {
  id: number;
  balance: string;
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

const FA2Transfer = ({
  index,
  setFieldValue,
  remove,
  getFieldProps,
}: props) => {
  const state = useContext(AppStateContext)!;
  const [value, setValue] = useState("");

  const [isFetching, setIsFetching] = useState(true);
  const [canSeeMore, setCanSeeMore] = useState(true);

  const [fa2Tokens, setFa2Tokens] = useState<fa2Token[]>([]);
  const [currentToken, setCurrentToken] = useState<fa2Token | undefined>();
  const [options, setOptions] = useState<option[]>([]);
  const fetchOffsetRef = useRef(0);

  const makeName = (key: string) => `transfers.${index}.values.${key}`;

  const updateValues = ({
    value,
    currentToken,
    tokenId,
    fa2Address,
  }: {
    value: string;
    currentToken: fa2Token | undefined;
    tokenId: string;
    fa2Address: string;
  }) => {
    setCurrentToken(currentToken);
    setFieldValue(makeName("token"), currentToken ?? "");
    setFieldValue(makeName("tokenId"), tokenId);
    setFieldValue(makeName("fa2Address"), fa2Address);
    setValue(value);
  };

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
    const value = getFieldProps(makeName("token")).value as fa2Token | "";

    if (!value) return;

    updateValues({
      value: value.token.metadata.name,
      currentToken: value,
      tokenId: value.token.tokenId,
      fa2Address: value.token.contract.address,
    });
  }, []);

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
    <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
      <div className="w-full md:grow">
        <Field name={makeName("token")} className="w-full">
          {() => (
            <Autocomplete
              label="FA2 Token"
              withSeeMore={canSeeMore}
              onSeeMore={() => {
                fetchOffsetRef.current += 20;

                fetchTokens(value, fetchOffsetRef.current).then(
                  (v: fa2Token[]) => {
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
                  }
                );
              }}
              onChange={newValue => {
                const parsedValue = Number(newValue);
                const currentToken = fa2Tokens.find(
                  ({ token: { id } }) => id === parsedValue
                );

                if (isNaN(parsedValue) || !currentToken) {
                  updateValues({
                    value: newValue,
                    currentToken: undefined,
                    tokenId: "",
                    fa2Address: "",
                  });
                } else {
                  updateValues({
                    value: currentToken.token.metadata.name,
                    currentToken: currentToken,
                    tokenId: currentToken.token.tokenId,
                    fa2Address: currentToken.token.contract.address,
                  });
                }
              }}
              value={value}
              options={options}
              placeholder="Search a token"
              loading={isFetching}
              renderOption={({
                thumbnailHash,
                tokenId,
                contractAddress,
                label,
              }) => {
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
          )}
        </Field>
        <ErrorMessage name={makeName("token")} render={renderError} />
      </div>
      <div className="flex flex-col">
        <label className="mb-1 text-white">Amount</label>
        <Field
          className="md:text-md relative h-fit min-h-fit w-full rounded p-2 text-sm md:w-auto"
          name={makeName("amount")}
          placeholder="1"
          validate={(x: string) => {
            const amount = Number(x);
            if (isNaN(amount) || amount <= 0 || !Number.isInteger(amount)) {
              return `Invalid amount ${x}`;
            } else if (
              !!currentToken &&
              amount > parseInt(currentToken.balance)
            ) {
              return `You only have ${currentToken.balance} tokens`;
            }
          }}
        />
        <ErrorMessage name={makeName("amount")} render={renderError} />
      </div>
      <div className="flex w-full flex-col md:grow">
        <label className="mb-1 text-white">Transfer to</label>
        <Field
          className="md:text-md relative h-fit min-h-fit w-full rounded p-2 text-sm md:w-auto"
          name={makeName("targetAddress")}
          placeholder="Destination address"
          validate={(x: string) =>
            validateAddress(x) !== ValidationResult.VALID
              ? `Invalid address ${x ?? ""}`
              : undefined
          }
        />
        <ErrorMessage name={makeName("targetAddress")} render={renderError} />
      </div>
      <button
        type="button"
        className="mx-none mt-4 block self-center justify-self-end rounded bg-primary p-1.5 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500 md:mx-auto md:mt-0 md:self-end"
        onClick={e => {
          e.preventDefault();

          remove(index);
        }}
      >
        Remove
      </button>
    </div>
  );
};

export default FA2Transfer;
