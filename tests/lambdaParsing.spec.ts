import { Parser } from "@taquito/michel-codec";
import { describe, expect, it } from "vitest";
import { LambdaType, parseLambda } from "../context/parseLambda";

const p = new Parser();

const FA2_LAMBDA = {
  old: p.parseMichelineExpression(`{
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
  }`)!,
  new: p.parseMichelineExpression(`{
    DROP;
    NIL operation ;
    PUSH address "fa2address";
    CONTRACT %transfer (list (pair (address %from_) (list %txs (pair (address %to_) (pair (nat %token_id) (nat %amount))))));
    IF_NONE { PUSH string "contract dosen't exist" ; FAILWITH } { } ;
    PUSH mutez 0 ;
    PUSH (list (pair (address %from_) (list %txs (pair (address %to_) (pair (nat %token_id) (nat %amount)))))) {Pair "walletAddress" {
      
            Pair "targetAddress1" (Pair 1 11) ;
            Pair "targetAddress2" (Pair 2 12) ;
            Pair "targetAddress3" (Pair 3 13) ;
      
    } };
    TRANSFER_TOKENS ;
    CONS ;
  }`)!,
};

const FA1_2_APPROVE_LAMBDA = {
  old: p.parseMichelineExpression(`{
    DROP ;
    PUSH address "fa1_2Address" ;
    CONTRACT %approve (pair (address :spender) (nat :value)) ;
    IF_NONE { PUSH string "contract dosen't exist" ; FAILWITH } { } ;
    PUSH mutez 0 ;
    PUSH (pair (address :spender) (nat :value)) (Pair "spenderAddress" 1) ;
    TRANSFER_TOKENS
  }`)!,
  new: p.parseMichelineExpression(`{
    DROP ;
    NIL operation;
    PUSH address "fa1_2Address" ;
    CONTRACT %approve (pair (address :spender) (nat :value)) ;
    IF_NONE { PUSH string "contract dosen't exist" ; FAILWITH } { } ;
    PUSH mutez 0 ;
    PUSH (pair (address :spender) (nat :value)) (Pair "spenderAddress" 1) ;
    TRANSFER_TOKENS ;
    CONS ;
  }`)!,
};

const FA1_2_TRANSFER_LAMBDA = {
  old: p.parseMichelineExpression(`{
    DROP ;
    PUSH address "fa1_2Address" ;
    CONTRACT %transfer (pair (address :from) (pair (address :to) (nat :amount))) ;
    IF_NONE { PUSH string "contract dosen't exist" ; FAILWITH } { } ;
    PUSH mutez 0 ;
    PUSH  (pair (address :from) (pair (address :to) (nat :amount))) (Pair "walletAddress" (Pair "targetAddress" 1)) ;
    TRANSFER_TOKENS
  }`)!,
  new: p.parseMichelineExpression(`{
    DROP ;
    NIL operation ;
    PUSH address "fa1_2Address" ;
    CONTRACT %transfer (pair (address :from) (pair (address :to) (nat :amount))) ;
    IF_NONE { PUSH string "contract dosen't exist" ; FAILWITH } { } ;
    PUSH mutez 0 ;
    PUSH  (pair (address :from) (pair (address :to) (nat :amount))) (Pair "walletAddress" (Pair "targetAddress" 1)) ;
    TRANSFER_TOKENS ;
    CONS ;
  }`)!,
};

const DELEGATE_LAMBDA = {
  old: p.parseMichelineExpression(`{
  DROP ;
  PUSH key_hash "baker_addr" ;
  SOME ;
  SET_DELEGATE ;
}`)!,
  new: p.parseMichelineExpression(`{
  DROP ;
  NIL operation;
  PUSH key_hash "baker_addr" ;
  SOME ;
  SET_DELEGATE ;
  CONS ;
}`)!,
};

const UN_DELEGATE_LAMBDA = {
  old: p.parseMichelineExpression(`{
  DROP ;
  NONE key_hash ;
  SET_DELEGATE ;
}`)!,
  new: p.parseMichelineExpression(`{
  DROP ;
  NIL operation ;
  NONE key_hash ;
  SET_DELEGATE ;
  CONS ;
}`)!,
};

const DEFAULT_ENTRYPOINT_LAMBDA = {
  old: p.parseMichelineExpression(`{
    DROP;
    PUSH address "test_address";
    CONTRACT (list (pair (address %from_) (list %txs (pair (address %to_) (pair (nat %token_id) (nat %amount))))));
    IF_NONE { PUSH string "contract dosen't exist" ; FAILWITH } { } ;
    PUSH mutez 0 ;
    PUSH (list (pair (address %from_) (list %txs (pair (address %to_) (pair (nat %token_id) (nat %amount)))))) {Pair "walletAddress" {
      
            Pair "targetAddress1" (Pair 1 11) ;
            Pair "targetAddress2" (Pair 2 12) ;
            Pair "targetAddress3" (Pair 3 13) ;
      
    } };
    TRANSFER_TOKENS
  }`)!,
  new: p.parseMichelineExpression(`{
    DROP;
    NIL operation ;
    PUSH address "test_address";
    CONTRACT (list (pair (address %from_) (list %txs (pair (address %to_) (pair (nat %token_id) (nat %amount))))));
    IF_NONE { PUSH string "contract dosen't exist" ; FAILWITH } { } ;
    PUSH mutez 0 ;
    PUSH (list (pair (address %from_) (list %txs (pair (address %to_) (pair (nat %token_id) (nat %amount)))))) {Pair "walletAddress" {
      
            Pair "targetAddress1" (Pair 1 11) ;
            Pair "targetAddress2" (Pair 2 12) ;
            Pair "targetAddress3" (Pair 3 13) ;
      
    } };
    TRANSFER_TOKENS ;
    CONS ;
  }`)!,
};

const DROP_DELEGATE_LAMBDA = {
  old: p.parseMichelineExpression(`{
    DROP ;
    NONE key_hash ;
    SET_DELEGATE ;
    DROP;
  }`)!,
  new: p.parseMichelineExpression(`{
    DROP ;
    NIL operation ;
    NONE key_hash ;
    SET_DELEGATE ;
    DROP ;
    CONS ;
  }`)!,
};

const DROP_OP_IN_IF_BRANCH_LAMBDA = {
  old: p.parseMichelineExpression(`{
    DROP;
    PUSH address "test_address";
    CONTRACT (list (pair (address %from_) (list %txs (pair (address %to_) (pair (nat %token_id) (nat %amount))))));
    IF_NONE { PUSH string "contract dosen't exist" ; FAILWITH } { DROP; } ;
    PUSH mutez 0 ;
    PUSH (list (pair (address %from_) (list %txs (pair (address %to_) (pair (nat %token_id) (nat %amount)))))) {Pair "walletAddress" {
      
            Pair "targetAddress1" (Pair 1 11) ;
            Pair "targetAddress2" (Pair 2 12) ;
            Pair "targetAddress3" (Pair 3 13) ;
      
    } };
    TRANSFER_TOKENS
  }`)!,
  new: p.parseMichelineExpression(`{
    DROP;
    NIL operation ;
    PUSH address "test_address";
    CONTRACT (list (pair (address %from_) (list %txs (pair (address %to_) (pair (nat %token_id) (nat %amount))))));
    IF_NONE { PUSH string "contract dosen't exist" ; FAILWITH } { DROP; } ;
    PUSH mutez 0 ;
    PUSH (list (pair (address %from_) (list %txs (pair (address %to_) (pair (nat %token_id) (nat %amount)))))) {Pair "walletAddress" {
      
            Pair "targetAddress1" (Pair 1 11) ;
            Pair "targetAddress2" (Pair 2 12) ;
            Pair "targetAddress3" (Pair 3 13) ;
      
    } };
    TRANSFER_TOKENS ;
    CONS ;
  }`)!,
};

describe("parseLambda old", () => {
  it("should parse the set delegate lambda", () => {
    const [lambdaType, data] = parseLambda("0.0.10", DELEGATE_LAMBDA.old);

    expect(lambdaType).toBe(LambdaType.DELEGATE);
    expect(data).toMatchObject({
      contractAddress: "",
      data: { address: "baker_addr" },
      entrypoint: { name: "", params: { name: "", type: "" } },
    });
  });

  it("should parse the unset delegate lambda", () => {
    const [lambdaType, data] = parseLambda("0.0.10", UN_DELEGATE_LAMBDA.old);

    expect(lambdaType).toBe(LambdaType.UNDELEGATE);
    expect(data).toMatchObject({
      contractAddress: "",
      data: {},
      entrypoint: { name: "", params: { name: "", type: "" } },
    });
  });

  it("should parse the default entrypoint lambda", () => {
    const [lambdaType, data] = parseLambda(
      "0.0.10",
      DEFAULT_ENTRYPOINT_LAMBDA.old
    );

    expect(lambdaType).toBe(LambdaType.CONTRACT_EXECUTION);
    expect(data).toMatchObject({
      contractAddress: "test_address",
      entrypoint: {
        name: "",
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
      data: `{Pair "walletAddress" {Pair "targetAddress1" (Pair 1 11); Pair "targetAddress2" (Pair 2 12); Pair "targetAddress3" (Pair 3 13)}}`,
      mutez: 0,
    });
  });

  it("should parse the fa2 lambda", () => {
    const [lambdaType, data] = parseLambda("0.0.10", FA2_LAMBDA.old);

    expect(lambdaType).toBe(LambdaType.FA2);
    expect(data).toMatchObject({
      contractAddress: "fa2address",
      mutez: 0,
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
    const [lambdaType, data] = parseLambda("0.0.10", FA1_2_APPROVE_LAMBDA.old);

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
      mutez: 0,
      data: {
        spender: "spenderAddress",
        value: 1,
      },
    });
  });

  it("should parse the fa1.2 transfer lambda", () => {
    const [lambdaType, data] = parseLambda("0.0.10", FA1_2_TRANSFER_LAMBDA.old);

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
      mutez: 0,
      data: {
        from: "walletAddress",
        to: "targetAddress",
        amount: 1,
      },
    });
  });

  it("should be parse as lambda execution 1", () => {
    const [lambdaType, data] = parseLambda("0.0.10", DROP_DELEGATE_LAMBDA.new);

    expect(lambdaType).toBe(LambdaType.LAMBDA_EXECUTION);
    expect(data).toBeUndefined;
  });

  it("should be parse as lambda execution 2", () => {
    const [lambdaType, data] = parseLambda(
      "0.0.10",
      DROP_OP_IN_IF_BRANCH_LAMBDA.old
    );

    expect(lambdaType).toBe(LambdaType.LAMBDA_EXECUTION);
    expect(data).toBeUndefined;
  });
});

describe("parseLambda new", () => {
  it("should parse the set delegate lambda", () => {
    const [lambdaType, data] = parseLambda("0.3.1", DELEGATE_LAMBDA.new);

    expect(lambdaType).toBe(LambdaType.DELEGATE);
    expect(data).toMatchObject({
      contractAddress: "",
      data: { address: "baker_addr" },
      entrypoint: { name: "", params: { name: "", type: "" } },
    });
  });

  it("should parse the unset delegate lambda", () => {
    const [lambdaType, data] = parseLambda("0.3.1", UN_DELEGATE_LAMBDA.new);

    expect(lambdaType).toBe(LambdaType.UNDELEGATE);
    expect(data).toMatchObject({
      contractAddress: "",
      data: {},
      entrypoint: { name: "", params: { name: "", type: "" } },
    });
  });

  it("should parse the default entrypoint lambda", () => {
    const [lambdaType, data] = parseLambda(
      "0.3.1",
      DEFAULT_ENTRYPOINT_LAMBDA.new
    );

    expect(lambdaType).toBe(LambdaType.CONTRACT_EXECUTION);
    expect(data).toMatchObject({
      contractAddress: "test_address",
      entrypoint: {
        name: "",
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
      data: `{Pair "walletAddress" {Pair "targetAddress1" (Pair 1 11); Pair "targetAddress2" (Pair 2 12); Pair "targetAddress3" (Pair 3 13)}}`,
      mutez: 0,
    });
  });

  it("should parse the fa2 lambda", () => {
    const [lambdaType, data] = parseLambda("0.3.1", FA2_LAMBDA.new);

    expect(lambdaType).toBe(LambdaType.FA2);
    expect(data).toMatchObject({
      contractAddress: "fa2address",
      mutez: 0,
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
    const [lambdaType, data] = parseLambda("0.3.1", FA1_2_APPROVE_LAMBDA.new);

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
      mutez: 0,
      data: {
        spender: "spenderAddress",
        value: 1,
      },
    });
  });

  it("should parse the fa1.2 transfer lambda", () => {
    const [lambdaType, data] = parseLambda("0.3.1", FA1_2_TRANSFER_LAMBDA.new);

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
      mutez: 0,
      data: {
        from: "walletAddress",
        to: "targetAddress",
        amount: 1,
      },
    });
  });

  it("should be parse as lambda execution 1", () => {
    const [lambdaType, data] = parseLambda("0.3.1", DROP_DELEGATE_LAMBDA.new);

    expect(lambdaType).toBe(LambdaType.LAMBDA_EXECUTION);
    expect(data).toBeUndefined;
  });

  it("should be parse as lambda execution 2", () => {
    const [lambdaType, data] = parseLambda(
      "0.3.1",
      DROP_OP_IN_IF_BRANCH_LAMBDA.old
    );

    expect(lambdaType).toBe(LambdaType.LAMBDA_EXECUTION);
    expect(data).toBeUndefined;
  });
});
