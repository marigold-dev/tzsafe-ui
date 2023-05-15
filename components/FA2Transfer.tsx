import { PlusIcon } from "@radix-ui/react-icons";
import { validateAddress, ValidationResult } from "@taquito/utils";
import { ErrorMessage, Field, FieldInputProps } from "formik";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { v4 as uuidV4 } from "uuid";
import { API_URL, THUMBNAIL_URL } from "../context/config";
import { AppStateContext } from "../context/state";
import { debounce } from "../utils/timeout";
import Alias from "./Alias";
import Select from "./Select";
import renderError from "./formUtils";

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
  image: string | undefined;
  contractAddress: string;
  token: fa2Token;
};

const FETCH_COUNT = 20;

const tokenToOption = (fa2Token: fa2Token) => {
  const { token } = fa2Token;
  const imageUri =
    token.metadata.thumbnailUri ?? token.metadata.displayUri ?? "";

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
    token: fa2Token,
  };
};

type fa2TransferProps = {
  localIndex: number;
  fa2ContractAddress?: string;
  onTokenChange?: (token: fa2Token) => void;
  toExclude: number[];
} & props;

const FA2Transfer = ({
  proposalIndex,
  localIndex,
  setFieldValue,
  remove,
  getFieldProps,
  onTokenChange,
  fa2ContractAddress,
  toExclude,
}: fa2TransferProps) => {
  const state = useContext(AppStateContext)!;

  const [isFetching, setIsFetching] = useState(true);
  const [canSeeMore, setCanSeeMore] = useState(true);

  const [filterValue, setFilterValue] = useState<string>("");
  const [currentToken, setCurrentToken] = useState<fa2Token | undefined>();
  const [options, setOptions] = useState<option[]>([]);
  const fetchOffsetRef = useRef(0);

  const makeName = (key: string) =>
    `transfers.${proposalIndex}.values.${localIndex}.${key}`;

  const updateValues = (newToken: fa2Token) => {
    onTokenChange?.(newToken);
    setCurrentToken(newToken);
    setFieldValue(`transfers.${proposalIndex}.values.${localIndex}`, {
      token: newToken ?? "",
      tokenId: newToken?.token.tokenId ?? "",
      fa2Address: newToken?.token.contract.address ?? "",
    });
  };

  const fetchTokens = useCallback(
    (value: string, offset: number) =>
      fetch(
        // `${API_URL}/v1/tokens/balances?account=${state.currentContract}&offset=${offset}&limit=20&token.metadata.name.as=*${value}*`
        `${API_URL}/v1/tokens/balances?account=tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb&offset=${offset}&limit=20&token.metadata.name.as=*${value}*${
          !!fa2ContractAddress ? "&token.contract=" + fa2ContractAddress : ""
        }`
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

          return Promise.resolve(
            v.filter(token => !toExclude.includes(token.id))
          );
        }),
    [state.currentContract]
  );

  useEffect(() => {
    const value = getFieldProps(makeName("token")).value as fa2Token | "";

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
                fetchOffsetRef.current += 20;

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
              renderOption={({ image, tokenId, contractAddress, label }) => {
                return (
                  <div className="flex">
                    <div className="aspect-square w-1/6 overflow-hidden rounded bg-zinc-500/50">
                      {!!image ? (
                        <img
                          src={image}
                          alt={label}
                          className="h-auto w-full"
                        />
                      ) : (
                        <img
                          src={
                            "https://uploads-ssl.webflow.com/616ab4741d375d1642c19027/61793ee65c891c190fcaa1d0_Vector(1).png"
                          }
                          alt={label}
                          className="h-auto w-full bg-zinc-500 p-2"
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

          remove(proposalIndex);
        }}
      >
        Remove
      </button>
    </div>
  );
};

type props = {
  proposalIndex: number;
  remove: (index: number) => void;
  setFieldValue: (name: string, value: any) => void;
  getFieldProps: (name: string) => FieldInputProps<any>;
};

const FA2TransferGroup = ({
  proposalIndex,
  remove,
  setFieldValue,
  getFieldProps,
}: props) => {
  const [selectedTokens, setSelectedTokens] = useState<
    (fa2Token | undefined)[]
  >([]);
  const [additionalTransfers, setAdditionalTransfers] = useState<string[]>([]);
  const [contractAddress, setContractAddress] = useState("");

  useEffect(() => {
    const values = [
      ...getFieldProps(`transfers.${proposalIndex}.values`).value,
    ];

    if (values.length <= 1) return;

    setAdditionalTransfers(values.slice(1).map(_ => uuidV4()));
    setFieldValue(`transfers.${proposalIndex}.values`, values);
  }, []);

  return (
    <div className="space-y-4">
      <FA2Transfer
        proposalIndex={proposalIndex}
        localIndex={0}
        remove={remove}
        setFieldValue={setFieldValue}
        getFieldProps={getFieldProps}
        onTokenChange={token => {
          setFieldValue(`transfers.${proposalIndex}.values`, []);
          setFieldValue(`transfers.${proposalIndex}.values.0`, {
            token,
            fa2Address: token.token.contract.address,
            tokenId: token.token.tokenId,
          });
          setSelectedTokens([token]);
          setAdditionalTransfers([]);
          setContractAddress(token.token.contract.address);
        }}
        toExclude={[]}
      />
      {additionalTransfers.map((uuid, i) => (
        <FA2Transfer
          key={uuid}
          proposalIndex={proposalIndex}
          localIndex={i + 1}
          remove={() => {
            setAdditionalTransfers(curr => curr.filter(v => v !== uuid));
            setSelectedTokens(curr => {
              const newTokens = [...curr];
              newTokens[i + 1] = undefined;
              return newTokens;
            });
          }}
          setFieldValue={setFieldValue}
          getFieldProps={getFieldProps}
          fa2ContractAddress={contractAddress}
          onTokenChange={token => {
            setSelectedTokens(curr => {
              const newTokens = [...curr];
              newTokens[i + 1] = token;
              return newTokens;
            });
          }}
          toExclude={(selectedTokens.filter(v => !!v) as fa2Token[]).map(
            v => v.id
          )}
        />
      ))}
      <div className="flex w-full items-center justify-between">
        <button
          type="button"
          onClick={() => setAdditionalTransfers(v => v.concat([uuidV4()]))}
          className="flex items-center space-x-2 rounded bg-primary px-2 py-1 text-white"
        >
          <PlusIcon />
          <span>Add</span>
        </button>
        {/* <button
          type="button"
          className={`mx-none mt-4 block self-center justify-self-end rounded bg-primary p-1.5 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500 md:mt-0`}
          onClick={e => {
            e.preventDefault();

            remove(proposalIndex);
          }}
        >
          Remove
        </button> */}
      </div>
    </div>
  );
};

export default FA2TransferGroup;
