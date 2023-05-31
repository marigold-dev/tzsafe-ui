import { PlusIcon } from "@radix-ui/react-icons";
import { validateAddress, ValidationResult } from "@taquito/utils";
import BigNumber from "bignumber.js";
import { Field, FieldProps, useFormikContext } from "formik";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { v4 as uuidV4 } from "uuid";
import { API_URL, THUMBNAIL_URL } from "../context/config";
import { AppStateContext } from "../context/state";
import { debounce } from "../utils/timeout";
import { proposals } from "../versioned/interface";
import ErrorMessage from "./ErrorMessage";
import RenderTokenOption from "./RenderTokenOption";
import Select from "./Select";

export type fa2Token = {
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
      decimals: string;
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
  autoSetField?: boolean;
} & props;

const FA2Transfer = ({
  proposalIndex,
  localIndex,
  remove,
  onTokenChange,
  fa2ContractAddress,
  toExclude,
  autoSetField = true,
}: fa2TransferProps) => {
  const state = useContext(AppStateContext)!;
  const { getFieldProps, setFieldValue, errors } =
    useFormikContext<proposals>();

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

    if (autoSetField) {
      const previousValue = getFieldProps(
        `transfers.${proposalIndex}.values.${localIndex}`
      ).value;

      if (
        Array.isArray(previousValue) ||
        (!!previousValue && "balance" in previousValue)
      ) {
        throw new Error("Expect previous value to be formValue");
      }

      setFieldValue(`transfers.${proposalIndex}.values.${localIndex}`, {
        ...(previousValue ?? {}),
        token: newToken ?? "",
        tokenId: newToken?.token.tokenId ?? "",
        fa2Address: newToken?.token.contract.address ?? "",
      });
    }
  };

  const fetchTokens = useCallback(
    (value: string, offset: number) =>
      fetch(
        `${API_URL}/v1/tokens/balances?account=${
          state.currentContract
        }&offset=${offset}&limit=${FETCH_COUNT}&token.metadata.name.as=*${value}*&balance.ne=0&sort.desc=lastTime&token.standard.eq=fa2${
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
    [state.currentContract, toExclude]
  );

  useEffect(() => {
    const value = getFieldProps(makeName("token")).value;

    if (!value) return;
    if (!("token" in value && "balance" in value)) {
      throw new Error("Value should be an fa2 token");
    }

    updateValues(value);
  }, []);

  useEffect(() => {
    debounce(() => {
      setIsFetching(true);
      fetchTokens(filterValue, 0).then((v: fa2Token[]) => {
        setOptions(v.map(tokenToOption));
        setIsFetching(false);
      });
    }, 150);
  }, [fetchTokens, filterValue, toExclude]);

  const tokenAmount = useMemo(() => {
    if (!currentToken) return;

    return BigNumber(currentToken.balance)
      .div(BigNumber(10).pow(currentToken.token.metadata.decimals))
      .toNumber();

    return;
  }, [currentToken]);

  return (
    <div className="fa2-grid-template grid items-start gap-x-4 space-y-2 xl:grid-rows-1 xl:space-y-0">
      <div>
        {!currentToken && <label className="text-transparent">Token</label>}

        <Field
          name={makeName("token")}
          validate={(value: string) =>
            !value ? "Please select a token" : undefined
          }
        >
          {() => (
            <Select
              placeholder="Please select an FA2 token"
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
              renderOption={RenderTokenOption}
            />
          )}
        </Field>
        <ErrorMessage name={makeName("token")} />
      </div>
      <div className="w-full">
        <label className="text-white">Amount</label>
        <div className="relative w-full">
          <Field
            name={makeName("amount")}
            validate={(x: string) => {
              if (!x) return "Value is empty";
              const amount = Number(x);
              if (isNaN(amount) || amount <= 0) {
                return `Invalid amount ${x}`;
              }

              if (!currentToken) return;

              if (
                currentToken.token.metadata.decimals === "0" &&
                !Number.isInteger(amount)
              ) {
                return "Amount must be an integer";
              } else if (amount > parseInt(currentToken.balance)) {
                return `You only have ${currentToken.balance} token${
                  Number(currentToken.balance) <= 1 ? "" : "s"
                }`;
              }
            }}
          >
            {({ field }: FieldProps) => (
              <>
                <input
                  {...field}
                  className="xl:text-md relative h-fit min-h-fit w-full rounded p-2 text-sm xl:w-full"
                  placeholder="1"
                />
                {!!currentToken && !field.value && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                    Max: {Number(tokenAmount) > 1000 ? "1000+" : tokenAmount}
                  </span>
                )}
              </>
            )}
          </Field>
        </div>
        <ErrorMessage name={makeName("amount")} />
      </div>
      <div>
        <label className="text-white">Transfer to</label>
        <Field
          className="xl:text-md relative h-fit min-h-fit w-full rounded p-2 text-sm"
          name={makeName("targetAddress")}
          placeholder="Destination address"
          validate={(x: string) =>
            validateAddress(x) !== ValidationResult.VALID
              ? `Invalid address ${x ?? ""}`
              : undefined
          }
        />
        <ErrorMessage name={makeName("targetAddress")} />
      </div>
      <div className="flex justify-center xl:block">
        <label className="hidden text-transparent xl:inline">helper</label>
        <button
          type="button"
          className={`mt-2 rounded bg-primary p-1.5 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500 xl:mt-0`}
          onClick={e => {
            e.preventDefault();

            remove(proposalIndex);
          }}
        >
          Remove
        </button>
        {<ErrorMessage name="empty" />}
      </div>
    </div>
  );
};

type formValue = {
  token: fa2Token;
  fa2Address: string;
  tokenId: string;
  amount?: string;
};

type props = {
  proposalIndex: number;
  remove: (index: number) => void;
};

const FA2TransferGroup = ({ proposalIndex, remove }: props) => {
  const { setFieldValue, getFieldProps } = useFormikContext();

  const [selectedTokens, setSelectedTokens] = useState<
    (fa2Token | undefined)[]
  >([]);
  const [additionalTransfers, setAdditionalTransfers] = useState<string[]>([]);
  const [contractAddress, setContractAddress] = useState("");

  useEffect(() => {
    const values = [
      ...((getFieldProps(`transfers.${proposalIndex}.values`)
        .value as formValue[]) ?? []),
    ];

    if (values.length <= 1) return;

    setAdditionalTransfers(values.slice(1).map(_ => uuidV4()));
    setFieldValue(`transfers.${proposalIndex}.values`, values);
  }, []);

  return (
    <div className="mt-2 space-y-6">
      <FA2Transfer
        proposalIndex={proposalIndex}
        localIndex={0}
        remove={remove}
        autoSetField={false}
        onTokenChange={token => {
          const data = {
            token,
            fa2Address: token.token.contract.address,
            tokenId: token.token.tokenId,
            amount: (
              getFieldProps(`transfers.${proposalIndex}.values.0`)
                .value as formValue
            ).amount,
          };

          if (token.token.contract.address === contractAddress) {
            setFieldValue(`transfers.${proposalIndex}.values.0`, data);
            setSelectedTokens(oldTokens => {
              const newTokens = [...oldTokens];
              newTokens[0] = token;
              return newTokens;
            });
          } else {
            setSelectedTokens([token]);
            setFieldValue(`transfers.${proposalIndex}.values`, [data]);
            setAdditionalTransfers([]);
            setContractAddress(token.token.contract.address);
          }
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
            const currentValues = getFieldProps(
              `transfers.${proposalIndex}.values`
            ).value;

            if (!Array.isArray(currentValues))
              throw new Error("currentValue must be formValue[]");

            setFieldValue(
              `transfers.${proposalIndex}.values`,
              currentValues.filter((_, ind) => ind !== i + 1)
            );
          }}
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
          className={`${
            !contractAddress ? "pointer-events-none opacity-70" : ""
          } flex items-center space-x-2 rounded bg-primary px-2 py-1 text-white`}
        >
          <PlusIcon />
          <span>Add</span>
        </button>
      </div>
    </div>
  );
};

export default FA2TransferGroup;
