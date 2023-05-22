import { validateAddress, ValidationResult } from "@taquito/utils";
import { ErrorMessage, Field, FieldInputProps } from "formik";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { API_URL, THUMBNAIL_URL } from "../context/config";
import { AppStateContext } from "../context/state";
import { debounce } from "../utils/timeout";
import Alias from "./Alias";
import Select from "./Select";
import renderError from "./formUtils";

type props = {
  index: number;
  remove: (index: number) => void;
  setFieldValue: (name: string, value: fa2Token | string) => void;
  getFieldProps: (name: string) => FieldInputProps<fa2Token | undefined>;
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
    metadata: {
      name: string;
      symbol: string;
      thumbnailUri?: string;
      displayUri?: string;
    };
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
  token: fa2Token;
};

const FETCH_COUNT = 20;

const tokenToOption = (fa2Token: fa2Token) => {
  const { token } = fa2Token;
  return {
    id: token.id.toString(),
    tokenId: token.tokenId,
    value: token.id.toString(),
    label: token.metadata.name,
    thumbnailHash: (
      token.metadata.thumbnailUri ??
      token.metadata.displayUri ??
      ""
    ).replace("ipfs://", ""),
    contractAddress: token.contract.address,
    token: fa2Token,
  };
};

const FA2Transfer = ({
  index,
  setFieldValue,
  remove,
  getFieldProps,
}: props) => {
  const state = useContext(AppStateContext)!;

  const [isFetching, setIsFetching] = useState(true);
  const [canSeeMore, setCanSeeMore] = useState(true);

  const [filterValue, setFilterValue] = useState<string>("");
  const [currentToken, setCurrentToken] = useState<fa2Token | undefined>();
  const [options, setOptions] = useState<option[]>([]);
  const fetchOffsetRef = useRef(0);

  const makeName = (key: string) => `transfers.${index}.values.${key}`;

  const updateValues = (newToken: fa2Token) => {
    setCurrentToken(newToken);
    setFieldValue(makeName("token"), newToken ?? "");
    setFieldValue(makeName("tokenId"), newToken?.token.tokenId ?? "");
    setFieldValue(
      makeName("fa2Address"),
      newToken?.token.contract.address ?? ""
    );
  };

  const fetchTokens = useCallback(
    (value: string, offset: number) =>
      fetch(
        `${API_URL}/v1/tokens/balances?account=${state.currentContract}&offset=${offset}&limit=${FETCH_COUNT}&token.metadata.name.as=*${value}*&balance.ne=0&sort.desc=lastTime&token.standard.eq=fa1`
      )
        .catch(e => {
          console.log(e);
          return {
            json() {
              return Promise.resolve([]);
            },
          };
        })
        .then(res => res.json())
        .then((v: fa2Token[]) => {
          setCanSeeMore(v.length === FETCH_COUNT);

          return Promise.resolve(v);
        }),
    [state.currentContract]
  );

  useEffect(() => {
    const value = getFieldProps(makeName("token")).value;

    if (!value) return;

    updateValues(value);
  }, []);

  useEffect(() => {
    setIsFetching(true);

    debounce(
      () =>
        fetchTokens(filterValue, 0).then((v: fa2Token[]) => {
          setOptions(v.map(tokenToOption));
          setIsFetching(false);
        }),
      150
    );
  }, [fetchTokens, filterValue]);

  return (
    <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
      <div className="w-full md:grow">
        <Field name={makeName("token")}>
          {() => (
            <Select
              placeholder="Please select an FA2 token"
              className={!currentToken ? "md:mt-7" : ""}
              label=""
              withSeeMore={canSeeMore}
              onSeeMore={() => {
                fetchOffsetRef.current += FETCH_COUNT;

                fetchTokens(filterValue, fetchOffsetRef.current).then(
                  (v: fa2Token[]) => {
                    setOptions(current => current.concat(v.map(tokenToOption)));
                  }
                );
              }}
              onSearch={setFilterValue}
              onChange={newValue => {
                updateValues(newValue.token);
              }}
              value={!!currentToken ? tokenToOption(currentToken) : undefined}
              options={options}
              loading={isFetching}
              renderOption={({
                thumbnailHash,
                tokenId,
                contractAddress,
                label,
              }) => {
                return (
                  <div className="flex">
                    <div className="relative aspect-square w-1/6 overflow-hidden rounded bg-zinc-500/50">
                      {!!thumbnailHash ? (
                        <img
                          src={`${THUMBNAIL_URL}/${thumbnailHash}`}
                          alt={label}
                          className="h-auto w-full"
                        />
                      ) : (
                        <img
                          src={
                            "https://uploads-ssl.webflow.com/616ab4741d375d1642c19027/61793ee65c891c190fcaa1d0_Vector(1).png"
                          }
                          alt={label}
                          className="h-auto w-full p-2"
                        />
                      )}
                    </div>

                    <div className="flex w-5/6 flex-col justify-between px-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400">
                          #{tokenId}
                        </span>

                        <Alias
                          address={contractAddress}
                          className="text-xs text-zinc-400"
                          disabled
                        />
                      </div>
                      <p className="text-left text-xs" title={label}>
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
      <div
        className={`flex flex-col ${!!currentToken ? "md:translate-y-1" : ""}`}
      >
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
      <div
        className={`flex w-full flex-col md:grow ${
          !!currentToken ? "md:translate-y-1" : ""
        }`}
      >
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
        className={`mx-none mt-4 block self-center justify-self-end rounded bg-primary p-1.5 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500 md:mx-auto md:mt-0 md:self-end`}
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
