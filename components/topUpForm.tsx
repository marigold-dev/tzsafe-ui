import { Parser } from "@taquito/michel-codec";
import { Schema } from "@taquito/michelson-encoder";
import { OpKind } from "@taquito/taquito";
import { tzip16 } from "@taquito/tzip16";
import BigNumber from "bignumber.js";
import { Field, FieldArray, FieldProps, Form, Formik } from "formik";
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { TZKT_API_URL, MODAL_TIMEOUT, THUMBNAIL_URL } from "../context/config";
import { useContracts } from "../context/contracts";
import { useAppDispatch, useAppState } from "../context/state";
import { TezosToolkitContext } from "../context/tezos-toolkit";
import fetchVersion from "../context/version";
import { useWallet } from "../context/wallet";
import { ContractStorage } from "../types/app";
import { mutezToTez, tezToMutez } from "../utils/tez";
import { debounce, promiseWithTimeout } from "../utils/timeout";
import { toStorage } from "../versioned/apis";
import ErrorMessage from "./ErrorMessage";
import { fa1_2Token } from "./FA1_2";
import { fa2Token } from "./FA2Transfer";
import RenderTokenOption from "./RenderTokenOption";
import Select from "./Select";
import ContractLoader from "./contractLoader";
import renderError from "./formUtils";

const FETCH_COUNT = 20;

type option = {
  id: string;
  value: string;
  label: string;
  tokenId: string;
  image: string | undefined;
  contractAddress: string;
  token: fa1_2Token | fa2Token;
};

const tokenToOption = (fa1_2orfa2: fa1_2Token | fa2Token) => {
  const { token } = fa1_2orfa2;
  const imageUri = token.metadata?.thumbnailUri ?? "";

  return {
    id: token.id.toString(),
    tokenId: token.tokenId,
    value: token.id.toString(),
    label: token.metadata?.name ?? "No name",
    image: imageUri.includes("http")
      ? imageUri
      : imageUri === ""
      ? undefined
      : `${THUMBNAIL_URL}/${imageUri.replace("ipfs://", "")}`,
    contractAddress: token.contract.address,
    token: fa1_2orfa2,
  };
};

type transfer = {
  to: string;
  source?: string | undefined;
  amount: number;
  fee?: number | undefined;
  parameter?: any | undefined;
  gasLimit?: number | undefined;
  storageLimit?: number | undefined;
  mutez?: boolean | undefined;
  kind: OpKind.TRANSACTION;
}[];

type formToken = {
  token: fa1_2Token | fa2Token | undefined;
  amount: number | undefined;
  tokenId: number | undefined;
  contractAddress: string | undefined;
};

function TopUp(props: {
  address: string;
  closeModal: (contract: ContractStorage) => void;
}) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { userAddress } = useWallet();
  const { tezos } = useContext(TezosToolkitContext);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<undefined | boolean>(undefined);

  const [canSeeMore, setCanSeeMore] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [selectError, setSelectError] = useState<undefined | string>(undefined);
  const [filterValue, setFilterValue] = useState("");
  const [options, setOptions] = useState<option[]>([]);
  const fetchOffsetRef = useRef(0);
  const { userBalance } = useWallet();
  const { addOrUpdateContract } = useContracts();

  const fetchTokens = useCallback(
    (value: string, offset: number) =>
      promiseWithTimeout(
        fetch(
          `${TZKT_API_URL}/v1/tokens/balances?account=${userAddress}&offset=${offset}&limit=${FETCH_COUNT}&token.metadata.name.as=*${value}*&balance.ne=0&sort.desc=lastTime&token.standard.in=fa1.2,fa2`
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
      ).then((v: fa1_2Token[] | fa2Token[] | number) => {
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
    setIsFetching(true);

    debounce(
      () =>
        fetchTokens(filterValue, 0).then(v => {
          setOptions(v.map(tokenToOption));
          setIsFetching(false);
        }),
      150
    );
  }, [fetchTokens, filterValue]);

  async function transfer({
    amount,
    tokens,
  }: {
    amount: string;
    tokens: formToken[];
  }) {
    if (!state.currentContract) return;

    const { fa2, fa1_2 } = tokens.reduce<{
      fa2: { [k: string]: formToken[] };
      fa1_2: { [k: string]: formToken[] };
    }>(
      (acc, curr) => {
        if (curr.token?.token.standard === "fa2") {
          acc.fa2[curr.contractAddress!] = [
            ...(acc.fa2[curr.contractAddress!] ?? []),
            curr,
          ];
        } else if (curr.token?.token.standard === "fa1.2") {
          acc.fa1_2[curr.contractAddress!] = [
            ...(acc.fa1_2[curr.contractAddress!] ?? []),
            curr,
          ];
        }

        return acc;
      },
      {
        fa2: {},
        fa1_2: {},
      }
    );

    const p = new Parser();

    const fa2Transfers = (await Promise.all(
      Object.entries(fa2).map(async ([address, tokens]) => {
        const contract = await tezos.contract.at(address);

        const data = p.parseMichelineExpression(
          `{ Pair "${userAddress}" { ${tokens
            .map(
              ({ tokenId, amount, token }) =>
                `Pair "${state.currentContract}" (Pair ${tokenId} ${BigNumber(
                  amount ?? 0
                )
                  .multipliedBy(
                    BigNumber(10).pow(token?.token.metadata?.decimals ?? 0)
                  )
                  .toNumber()}) ;`
            )
            .join("\n")} } }`
        );
        const schema = new Schema(contract.entrypoints.entrypoints["transfer"]);

        return {
          kind: OpKind.TRANSACTION,
          ...contract.methods.transfer(schema.Execute(data)).toTransferParams(),
        };
      })
    )) as transfer;

    const fa1_2Transfers = (
      await Promise.all(
        Object.entries(fa1_2).map(async ([address, tokens]) => {
          const contract = await tezos.contract.at(address);

          return tokens.map(formToken => ({
            kind: OpKind.TRANSACTION,
            ...contract.methods
              .transfer(
                userAddress,
                state.currentContract,
                BigNumber(formToken.amount ?? 0)
                  .multipliedBy(
                    BigNumber(10).pow(
                      formToken.token?.token.metadata?.decimals ?? 0
                    )
                  )
                  .toNumber()
              )
              .toTransferParams(),
          }));
        })
      )
    ).flat() as transfer;

    const batch = tezos.wallet.batch(
      (!!amount && Number(amount) > 0
        ? ([
            {
              kind: OpKind.TRANSACTION,
              to: state.currentContract,
              amount: tezToMutez(Number(amount)),
              mutez: true,
            },
          ] as transfer)
        : []
      )
        .concat(fa2Transfers)
        .concat(fa1_2Transfers)
    );

    const op = await batch.send();

    await op.confirmation();
  }

  if (loading) {
    return (
      <div className="flex w-full flex-col items-center justify-center">
        <ContractLoader loading={loading} />
        <span className="mt-4 text-zinc-400">
          Sending and waiting for transaction confirmation (It may take a few
          minutes)
        </span>
      </div>
    );
  }

  return (
    <Formik
      initialValues={{
        amount: "",
        tokens: [],
      }}
      validate={values => {
        const parsed = Number(values.amount);

        if (!!values.amount && (isNaN(parsed) || parsed <= 0)) {
          return { amount: `Invalid amount ${values.amount}` };
        }
      }}
      onSubmit={async values => {
        setLoading(true);
        try {
          await transfer(values);
          const c = await tezos.wallet.at(props.address, tzip16);
          const balance = await tezos.tz.getBalance(props.address);
          const cs: ContractStorage = await c.storage();
          const version = await fetchVersion(c);

          const storage = toStorage(version, cs, balance);

          if (!!state.contracts[props.address]) {
            // dispatch({
            //   type: "updateContract",
            //   payload: {
            //     address: props.address,
            //     contract: toStorage(version, cs, balance),
            //   },
            // });
            addOrUpdateContract(props.address, toStorage(version, cs, balance));
          } else {
            storage.address = props.address;

            dispatch({
              type: "setCurrentStorage",
              payload: storage as ContractStorage & { address: string },
            });
          }

          setResult(true);
        } catch (e) {
          console.log(e);
          setResult(false);
        }
        setLoading(false);
        setTimeout(() => {
          props.closeModal(state.contracts[props.address]);
        }, MODAL_TIMEOUT);
      }}
    >
      {({ values, setFieldValue }) => {
        const updateValues = (newToken: fa1_2Token | fa2Token, i: number) => {
          setFieldValue(`tokens.${i}.token`, newToken ?? "");
          setFieldValue(`tokens.${i}.tokenId`, newToken?.token.tokenId ?? "");
          setFieldValue(
            `tokens.${i}.contractAddress`,
            newToken?.token.contract.address ?? ""
          );
        };

        return (
          <Form className="col-span-2 mt-2 flex flex-col items-start justify-center">
            {!loading && typeof result != "undefined" && (
              <div className="mb-8 flex w-full items-center justify-between md:h-12">
                <ContractLoader loading={loading}>
                  {result ? (
                    <div className="my-auto flex flex-row text-sm font-bold text-white md:text-xl">
                      <span>Transfer successful</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="ml-4 h-6 w-6"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                    </div>
                  ) : (
                    <span className="my-auto text-sm font-bold text-white md:text-xl">
                      Failed to transfer tokens
                    </span>
                  )}
                </ContractLoader>
              </div>
            )}
            <div className="flex w-full flex-col justify-between md:items-start">
              <label className="font-medium text-white">Amount of Tez</label>
              <div className="relative mt-2 w-full">
                <Field
                  name="amount"
                  className="w-full rounded-md p-2"
                  placeholder="1"
                />
                {!!userBalance && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                    Max:{" "}
                    {mutezToTez(Number(userBalance)) > 1000
                      ? "1000+"
                      : mutezToTez(Number(userBalance))}
                  </span>
                )}
              </div>
              <ErrorMessage name="amount" />
            </div>
            <FieldArray name="tokens">
              {({ remove, push }) => (
                <section className="w-full">
                  {values.tokens.map(({ token }: formToken, i) => {
                    const balance = !!token
                      ? BigNumber(token.balance)
                          .div(
                            BigNumber(10).pow(
                              token.token.metadata?.decimals ?? 0
                            )
                          )
                          .toNumber()
                      : undefined;

                    return (
                      <div
                        key={i}
                        className="fund-grid-template grid items-start gap-x-4 space-y-2 xl:grid-rows-1 xl:space-y-0"
                      >
                        <div className="w-full md:grow">
                          {!token && (
                            <label className="text-transparent">Token</label>
                          )}
                          <Field
                            name={`tokens.${i}.token`}
                            validate={(x: string) => {
                              return !x ? "Please select a token" : undefined;
                            }}
                          >
                            {() => (
                              <Select
                                placeholder="Please select an FA1.2/FA2 token"
                                label=""
                                withSeeMore={canSeeMore}
                                onSeeMore={() => {
                                  fetchOffsetRef.current += FETCH_COUNT;

                                  fetchTokens(
                                    filterValue,
                                    fetchOffsetRef.current
                                  ).then(v => {
                                    setOptions(current =>
                                      current.concat(v.map(tokenToOption))
                                    );
                                  });
                                }}
                                onSearch={setFilterValue}
                                onChange={newValue => {
                                  updateValues(newValue.token, i);
                                }}
                                value={
                                  !!token ? tokenToOption(token) : undefined
                                }
                                options={options}
                                loading={isFetching}
                                renderOption={RenderTokenOption}
                                error={selectError}
                                onBlur={() => setFilterValue("")}
                                clearInputOnClose
                              />
                            )}
                          </Field>
                          <ErrorMessage name={`tokens.${i}.token`} />
                        </div>
                        <div className="w-full">
                          <label className="text-white">Amount</label>
                          <div className="relative w-full">
                            <Field
                              name={`tokens.${i}.amount`}
                              validate={(x: string) => {
                                if (!x) return "Value is empty";

                                const amount = Number(x);

                                if (isNaN(amount) || amount <= 0) {
                                  return `Invalid amount ${x}`;
                                }

                                if (!balance) return;

                                if (amount > balance) {
                                  return `You only have ${balance} token${
                                    balance <= 1 ? "" : "s"
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
                                  {!!balance && !field.value && (
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                                      Max: {balance > 1000 ? "1000+" : balance}
                                    </span>
                                  )}
                                </>
                              )}
                            </Field>
                          </div>
                          <ErrorMessage name={`tokens.${i}.amount`} />
                        </div>
                        <div className="flex justify-center xl:block">
                          <label className="hidden text-transparent xl:inline">
                            helper
                          </label>
                          <button
                            type="button"
                            className={`mt-2 rounded bg-primary p-1.5 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500 xl:mb-1 xl:mt-0`}
                            onClick={e => {
                              e.preventDefault();

                              remove(i);
                            }}
                          >
                            Remove
                          </button>
                          <p className="hidden xl:block">
                            {renderError(undefined)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    className="mt-2 rounded bg-primary p-2 font-medium text-white hover:bg-red-500 focus:bg-red-500"
                    onClick={e => {
                      push({
                        contractAddress: undefined,
                        amount: undefined,
                        token: undefined,
                      });
                    }}
                  >
                    Add token
                  </button>
                </section>
              )}
            </FieldArray>
            <div className="mt-4 flex w-full justify-center">
              <button
                className="my-2 rounded bg-primary px-4 py-2 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500"
                type="submit"
              >
                Fund
              </button>
            </div>
          </Form>
        );
      }}
    </Formik>
  );
}

export default TopUp;
