import { Field, useFormikContext } from "formik";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { TZKT_API_URL, THUMBNAIL_URL } from "../context/config";
import { AppStateContext } from "../context/state";
import { debounce, promiseWithTimeout } from "../utils/timeout";
import { proposals } from "../versioned/interface";
import ErrorMessage from "./ErrorMessage";
import RenderTokenOption from "./RenderTokenOption";
import Select from "./Select";
import renderError from "./formUtils";

type props = {
  index: number;
  children: (token: fa1_2Token | undefined) => React.ReactNode;
  remove: (index: number) => void;
};

export type fa1_2Token = {
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

const FA1_2 = ({ index, remove, children }: props) => {
  const state = useContext(AppStateContext)!;
  const { setFieldValue, getFieldProps } = useFormikContext<proposals>();

  const [isFetching, setIsFetching] = useState(true);
  const [canSeeMore, setCanSeeMore] = useState(true);
  const [selectError, setSelectError] = useState<undefined | string>();

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
      makeName("fa1_2Address"),
      newToken?.token.contract.address ?? ""
    );
  };

  const fetchTokens = useCallback(
    (value: string, offset: number) =>
      promiseWithTimeout(
        fetch(
          `${TZKT_API_URL}/v1/tokens/balances?account=${state.currentContract}&offset=${offset}&limit=${FETCH_COUNT}&token.metadata.name.as=*${value}*&balance.ne=0&sort.desc=lastTime&token.standard.eq=fa1.2`
        )
          .catch(e => {
            console.log(e);
            return {
              json() {
                return Promise.resolve([]);
              },
            };
          })
          .then(res => res.json()),
        3000
      ).then((v: fa1_2Token[] | number) => {
        if (typeof v === "number") {
          setSelectError("Failed to fetch the tokens. Please try again");
          return Promise.resolve([]);
        }

        setSelectError(undefined);
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
    <div className="fa2-grid-template grid items-start gap-x-4 space-y-2 xl:grid-rows-1 xl:space-y-0">
      <div className="w-full md:grow">
        {!currentToken && <label className="text-transparent">Token</label>}
        <Field
          name={makeName("token")}
          validate={(x: string) => {
            return !x ? "Please select a token" : undefined;
          }}
        >
          {() => (
            <Select
              placeholder="Please select an FA1.2 token"
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
              renderOption={RenderTokenOption}
              error={selectError}
            />
          )}
        </Field>
        <ErrorMessage name={makeName("token")} />
      </div>
      {children(currentToken)}
      <div className="flex justify-center xl:block">
        <label className="hidden text-transparent xl:inline">helper</label>
        <button
          type="button"
          className={`mt-2 rounded bg-primary p-1.5 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500 xl:mb-1 xl:mt-0`}
          onClick={e => {
            e.preventDefault();

            remove(index);
          }}
        >
          Remove
        </button>
        {renderError(undefined)}
      </div>
    </div>
  );
};

export default FA1_2;
