import { Parser } from "@taquito/michel-codec";
import { describe, expect, it } from "vitest";
import { LambdaType, parseLambda } from "../context/parseLambda";

const p = new Parser();
const FA2_LAMBDA = p.parseMichelineExpression(`{
    DROP;
    PUSH address "fa2address";
    CONTRACT %transfer (list (pair (address %from_) (list %txs (pair (address %to_) (pair (nat %token_id) (nat %amount))))));
    IF_NONE { PUSH string "contract dosen't exist" ; FAILWITH } { } ;
    PUSH mutez 0 ;
    PUSH (list (pair (address %from_) (list %txs (pair (address %to_) (pair (nat %token_id) (nat %amount)))))) {Pair "walletAddress" {
      
            Pair "targetAddress1" (Pair 1 11) ;
            Pair "targetAddress2" (Pair 2 12) ;
            Pair "targetAddress3" (Pair 3 13) ;
      
    } };
    TRANSFER_TOKENS
  }`)!;

const FA1_2_APPROVE_LAMBDA = p.parseMichelineExpression(`{
    DROP ;
    PUSH address "fa1_2Address" ;
    CONTRACT %approve (pair (address :spender) (nat :value)) ;
    IF_NONE { PUSH string "contract dosen't exist" ; FAILWITH } { } ;
    PUSH mutez 0 ;
    PUSH (pair (address :spender) (nat :value)) (Pair "spenderAddress" 1) ;
    TRANSFER_TOKENS
  }`)!;

const FA1_2_TRANSFER_LAMBDA = p.parseMichelineExpression(`{
    DROP ;
    PUSH address "fa1_2Address" ;
    CONTRACT %transfer (pair (address :from) (pair (address :to) (nat :amount))) ;
    IF_NONE { PUSH string "contract dosen't exist" ; FAILWITH } { } ;
    PUSH mutez 0 ;
    PUSH  (pair (address :from) (pair (address :to) (nat :amount))) (Pair "walletAddress" (Pair "targetAddress" 1)) ;
    TRANSFER_TOKENS
  }`)!;

describe("parseLambda", () => {
  it("should parse the fa2 lambda", () => {
    const [lambdaType, data] = parseLambda(FA2_LAMBDA);

    expect(lambdaType).toBe(LambdaType.FA2);
    expect(data).toMatchObject({
      contractAddress: "fa2address",
      entrypoint: {
        name: "transfer",
        params: {
          name: undefined,
          type: "list",
          children: [
            {
              name: undefined,
              type: "pair",
              children: [
                { name: "from_", type: "address" },
                {
                  name: "txs",
                  type: "list",
                  children: [
                    {
                      name: undefined,
                      type: "pair",
                      children: [
                        { name: "to_", type: "address" },
                        {
                          type: "pair",
                          name: undefined,
                          children: [
                            { name: "token_id", type: "nat" },
                            { name: "amount", type: "nat" },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      data: [
        {
          from_: "walletAddress",
          txs: [
            { to_: "targetAddress1", token_id: 1, amount: 11 },
            { to_: "targetAddress2", token_id: 2, amount: 12 },
            { to_: "targetAddress3", token_id: 3, amount: 13 },
          ],
        },
      ],
    });
  });

  it("should parse the fa1.2 approve lambda", () => {
    const [lambdaType, data] = parseLambda(FA1_2_APPROVE_LAMBDA);

    expect(lambdaType).toBe(LambdaType.FA1_2_APPROVE);
    expect(data).toMatchObject({
      contractAddress: "fa1_2Address",
      entrypoint: {
        name: "approve",
        params: {
          name: undefined,
          type: "pair",
          children: [
            { name: "spender", type: "address" },
            { name: "value", type: "nat" },
          ],
        },
      },
      data: {
        spender: "spenderAddress",
        value: 1,
      },
    });
  });

  it("should parse the fa1.2 transfer lambda", () => {
    const [lambdaType, data] = parseLambda(FA1_2_TRANSFER_LAMBDA);

    expect(lambdaType).toBe(LambdaType.FA1_2_TRANSFER);
    expect(data).toMatchObject({
      contractAddress: "fa1_2Address",
      entrypoint: {
        name: "transfer",
        params: {
          name: undefined,
          type: "pair",
          children: [
            { name: "from", type: "address" },
            {
              type: "pair",
              children: [
                { name: "to", type: "address" },
                { name: "amount", type: "nat" },
              ],
            },
          ],
        },
      },
      data: {
        from: "walletAddress",
        to: "targetAddress",
        amount: 1,
      },
    });
  });
});
