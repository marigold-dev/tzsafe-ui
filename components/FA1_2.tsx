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
  children: React.ReactNode;
  remove: (index: number) => void;
  setFieldValue: (name: string, value: fa1_2Token | string) => void;
  getFieldProps: (name: string) => FieldInputProps<fa1_2Token | undefined>;
};

type fa1_2Token = {
  id: number;
  account: {
    address: string;
  };
  token: {
    id: number;
    contract: {
      address: string;
    };
    tokenId: "0";
    standard: "fa1.2";
    totalSupply: string;
    metadata: {
      name: string;
      symbol: string;
      decimals: string;
      thumbnailUri: string;
    };
  };
  balance: string;
  transfersCount: number;
  firstLevel: number;
  firstTime: string;
  lastLevel: number;
  lastTime: string;
};

type option = {
  id: string;
  value: string;
  label: string;
  tokenId: string;
  image: string | undefined;
  contractAddress: string;
  token: fa1_2Token;
};

const FETCH_COUNT = 20;

const tokenToOption = (fa1_2Token: fa1_2Token) => {
  const { token } = fa1_2Token;
  const imageUri = token.metadata.thumbnailUri ?? "";

  return {
    id: token.id.toString(),
    tokenId: token.tokenId,
    value: token.id.toString(),
    label: token.metadata.name,
    image: imageUri.includes("http")
      ? imageUri
      : imageUri === ""
      ? undefined
      : `${THUMBNAIL_URL}/${imageUri.replace("ipfs://", "")}`,
    contractAddress: token.contract.address,
    token: fa1_2Token,
  };
};

const FA1_2 = ({
  index,
  setFieldValue,
  remove,
  getFieldProps,
  children,
}: props) => {
  const state = useContext(AppStateContext)!;

  const [isFetching, setIsFetching] = useState(true);
  const [canSeeMore, setCanSeeMore] = useState(true);

  const [filterValue, setFilterValue] = useState<string>("");
  const [currentToken, setCurrentToken] = useState<fa1_2Token | undefined>();
  const [options, setOptions] = useState<option[]>([]);
  const fetchOffsetRef = useRef(0);

  const makeName = (key: string) => `transfers.${index}.values.${key}`;

  const updateValues = (newToken: fa1_2Token) => {
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
        `${API_URL}/v1/tokens/balances?account=tz1KrnickNwpLhmLPvwMYQUvo47w39WSzoJV&offset=${offset}&limit=${FETCH_COUNT}&token.metadata.name.as=*${value}*&balance.ne=0&sort.desc=lastTime&token.standard.eq=fa1.2`
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
        .then((v: fa1_2Token[]) => {
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
        fetchTokens(filterValue, 0).then((v: fa1_2Token[]) => {
          setOptions(v.map(tokenToOption));
          setIsFetching(false);
        }),
      150
    );
  }, [fetchTokens, filterValue]);

  return (
    <div className="grid grid-cols-3 grid-rows-2 items-end gap-x-4">
      <div className="w-full md:grow">
        <Field name={makeName("token")}>
          {() => (
            <Select
              placeholder="Please select an FA1.2 token"
              className={!currentToken ? "md:mt-7" : ""}
              label=""
              withSeeMore={canSeeMore}
              onSeeMore={() => {
                fetchOffsetRef.current += FETCH_COUNT;

                fetchTokens(filterValue, fetchOffsetRef.current).then(
                  (v: fa1_2Token[]) => {
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
              renderOption={({ image, tokenId, contractAddress, label }) => {
                return (
                  <div className="flex">
                    <div className="aspect-square w-12 overflow-hidden rounded bg-zinc-500/50">
                      {!!image ? (
                        <img
                          src={image}
                          alt={label}
                          className="h-auto w-full p-1"
                          onError={e => {
                            // @ts-ignore
                            e.target.src =
                              "https://uploads-ssl.webflow.com/616ab4741d375d1642c19027/61793ee65c891c190fcaa1d0_Vector(1).png";
                          }}
                        />
                      ) : (
                        <img
                          src={
                            "https://uploads-ssl.webflow.com/616ab4741d375d1642c19027/61793ee65c891c190fcaa1d0_Vector(1).png"
                          }
                          alt={label}
                          className="h-auto w-full p-1"
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
      {children}
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

export default FA1_2;
