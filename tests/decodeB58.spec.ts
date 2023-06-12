import { Parser, Expr } from "@taquito/michel-codec";
import { describe, expect, it } from "vitest";
import { decodeB58, toRightAssociative } from "../utils/contractParam";

const p = new Parser();

let t_data = (instr: Expr): [Expr, Expr] => {
  if (Array.isArray(instr)) {
    const expr = instr.find(v => "prim" in v && v.prim === "PUSH");
    if (!expr || !("prim" in expr) || !expr.args?.[0] || !expr.args?.[1]) {
      throw new Error("should be prim PUSH");
    }
    return [expr.args[0], expr.args[1]];
  } else {
    throw new Error("should be instructions");
  }
};

describe("decodeB58 int", () => {
  it("no address, shouldn't change anything", () => {
    const instr = p.parseMichelineExpression(` { PUSH int 1 }`)!;
    const [type, data] = t_data(instr);

    const new_data = decodeB58(type, data);
    expect(new_data).toMatchObject(data);
  });
});

describe("decodeB58 nat", () => {
  it("no address, shouldn't change anything", () => {
    const instr = p.parseMichelineExpression(` { PUSH nat 1 }`)!;
    const [type, data] = t_data(instr);

    const new_data = decodeB58(type, data);
    expect(new_data).toMatchObject(data);
  });
});

describe("decodeB58 address", () => {
  it("should be present in string representation", () => {
    const instr = p.parseMichelineExpression(
      ` { PUSH address 0x0127c988d571b6776a5fa65ff4cd66328f6dff1ba300 }`
    )!;
    const [type, data] = t_data(instr);

    const new_data = decodeB58(type, data);
    expect(new_data).toMatchObject({
      string: "KT1CD9M7KgWDQ3RozRfrT82mSuG9W2b7QDFA",
    });
  });
});

describe("no need to decodeB58 address", () => {
  it("nothing should be changed", () => {
    const instr = p.parseMichelineExpression(
      ` { PUSH address "KT1CD9M7KgWDQ3RozRfrT82mSuG9W2b7QDFA" }`
    )!;
    const [type, data] = t_data(instr);

    const new_data = decodeB58(type, data);
    expect(new_data).toMatchObject({
      string: "KT1CD9M7KgWDQ3RozRfrT82mSuG9W2b7QDFA",
    });
  });
});

describe("no need to decodeB58 key_hash", () => {
  it("should be present in string representation", () => {
    const instr = p.parseMichelineExpression(
      ` { PUSH key_hash 0x0077c6399c2ea03f4f3a00a8f805f083f97d775c1f}`
    )!;
    const [type, data] = t_data(instr);

    const new_data = decodeB58(type, data);
    expect(new_data).toMatchObject({
      string: "tz1WZLZs5SbL8pMJfoWNKVhkgpSGQtjHwX4B",
    });
  });
});

describe("decodeB58 key", () => {
  it("should be present in string representation", () => {
    const instr = p.parseMichelineExpression(
      ` { PUSH key 0x004798d2cc98473d7e250c898885718afd2e4efbcb1a1595ab9730761ed830de0f }`
    )!;
    const [type, data] = t_data(instr);
    const new_data = decodeB58(type, data);

    expect(new_data).toMatchObject({
      string: "edpkuBknW28nW72KG6RoHtYW7p12T6GKc7nAbwYX5m8Wd9sDVC9yav",
    });
  });
});

describe("decodeB58 address on the right of or", () => {
  it("should be present in string representation", () => {
    const instr = p.parseMichelineExpression(
      ` { PUSH (or nat address) (Right 0x0127c988d571b6776a5fa65ff4cd66328f6dff1ba300) }`
    )!;
    const [type, data] = t_data(instr);

    const new_data = decodeB58(type, data);
    expect(new_data).toMatchObject({
      string: "KT1CD9M7KgWDQ3RozRfrT82mSuG9W2b7QDFA",
    });
  });
});

describe("decodeB58 address on the left of or", () => {
  it("should be present in string representation", () => {
    const instr = p.parseMichelineExpression(
      ` { PUSH (or address nat) (Left 0x0127c988d571b6776a5fa65ff4cd66328f6dff1ba300) }`
    )!;
    const [type, data] = t_data(instr);

    const new_data = decodeB58(type, data);
    expect(new_data).toMatchObject({
      string: "KT1CD9M7KgWDQ3RozRfrT82mSuG9W2b7QDFA",
    });
  });
});

describe("decodeB58 address on pair", () => {
  it("should be present in string representation", () => {
    const instr = p.parseMichelineExpression(
      ` { PUSH (pair address address) (Pair 0x0127c988d571b6776a5fa65ff4cd66328f6dff1ba300 0x0127c988d571b6776a5fa65ff4cd66328f6dff1ba300) }`
    )!;
    const [type, data] = t_data(instr);

    const new_data = decodeB58(type, data);

    expect(new_data).toMatchObject({
      prim: "Pair",
      args: [
        {
          string: "KT1CD9M7KgWDQ3RozRfrT82mSuG9W2b7QDFA",
        },
        {
          string: "KT1CD9M7KgWDQ3RozRfrT82mSuG9W2b7QDFA",
        },
      ],
    });
  });
});

describe("decodeB58 address on map", () => {
  it("should be present in string representation", () => {
    const instr = p.parseMichelineExpression(
      ` { PUSH (map nat address) {Elt 1 0x0127c988d571b6776a5fa65ff4cd66328f6dff1ba300; Elt 2 0x0127c988d571b6776a5fa65ff4cd66328f6dff1ba300;} }`
    )!;

    const [type, data] = t_data(instr);
    const new_data = decodeB58(type, data);

    expect(JSON.stringify(new_data)).toMatchObject(
      JSON.stringify([
        {
          prim: "Elt",
          args: [
            {
              int: "1",
            },
            {
              string: "KT1CD9M7KgWDQ3RozRfrT82mSuG9W2b7QDFA",
            },
          ],
        },
        {
          prim: "Elt",
          args: [
            {
              int: "2",
            },
            {
              string: "KT1CD9M7KgWDQ3RozRfrT82mSuG9W2b7QDFA",
            },
          ],
        },
      ])
    );
  });
});

describe("decodeB58 address on option with some", () => {
  it("should be present in string representation", () => {
    const instr = p.parseMichelineExpression(
      ` { PUSH (option address) (Some 0x0127c988d571b6776a5fa65ff4cd66328f6dff1ba300) }`
    )!;
    const [type, data] = t_data(instr);
    const new_data = decodeB58(type, data);

    expect(new_data).toMatchObject({
      prim: "Some",
      args: [
        {
          string: "KT1CD9M7KgWDQ3RozRfrT82mSuG9W2b7QDFA",
        },
      ],
    });
  });
});

describe("decodeB58 address on option with none", () => {
  it("nothing should be change", () => {
    const instr = p.parseMichelineExpression(
      ` { PUSH (option address) None }`
    )!;
    const [type, data] = t_data(instr);
    const new_data = decodeB58(type, data);

    expect(new_data).toMatchObject({
      prim: "None",
    });
  });
});

describe("decodeB58 address on list", () => {
  it("should be present in string representation", () => {
    const instr = p.parseMichelineExpression(
      ` { PUSH (list address) {0x0127c988d571b6776a5fa65ff4cd66328f6dff1ba300; 0x0127c988d571b6776a5fa65ff4cd66328f6dff1ba300}} }`
    )!;
    const [type, data] = t_data(instr);
    const new_data = decodeB58(type, data);

    expect(new_data).toMatchObject([
      {
        string: "KT1CD9M7KgWDQ3RozRfrT82mSuG9W2b7QDFA",
      },
      {
        string: "KT1CD9M7KgWDQ3RozRfrT82mSuG9W2b7QDFA",
      },
    ]);
  });
});

describe("decodeB58 address on set", () => {
  it("should be present in string representation", () => {
    const instr = p.parseMichelineExpression(
      ` { PUSH (set address) {0x0127c988d571b6776a5fa65ff4cd66328f6dff1ba300; 0x0158f34461ea883382831e9d9333c1b88749130e7c00}} }`
    )!;
    const [type, data] = t_data(instr);
    const new_data = decodeB58(type, data);

    expect(new_data).toMatchObject([
      {
        string: "KT1CD9M7KgWDQ3RozRfrT82mSuG9W2b7QDFA",
      },
      {
        string: "KT1Gh6T9CjpxEV6WxCzgExhrATEYtcLN5Fdp",
      },
    ]);
  });
});

describe("decodeB58 address on set with the same elements ", () => {
  it("should be present in string representation", () => {
    const instr = p.parseMichelineExpression(
      ` { PUSH (set address) {0x0127c988d571b6776a5fa65ff4cd66328f6dff1ba300; 0x0127c988d571b6776a5fa65ff4cd66328f6dff1ba300}} }`
    )!;
    const [type, data] = t_data(instr);
    const new_data = decodeB58(type, data);

    expect(new_data).toMatchObject([
      {
        string: "KT1CD9M7KgWDQ3RozRfrT82mSuG9W2b7QDFA",
      },
      {
        string: "KT1CD9M7KgWDQ3RozRfrT82mSuG9W2b7QDFA",
      },
    ]);
  });
});

describe("decodeB58 address on ticket ", () => {
  it("should be present in string representation", () => {
    const type = p.parseJSON({
      prim: "ticket",
      args: [
        {
          prim: "address",
        },
      ],
    });
    const data = p.parseJSON({
      prim: "Pair",
      args: [
        {
          bytes: "0127c988d571b6776a5fa65ff4cd66328f6dff1ba300",
        },
        {
          prim: "Pair",
          args: [
            {
              bytes: "0127c988d571b6776a5fa65ff4cd66328f6dff1ba300",
            },
            {
              int: "1",
            },
          ],
        },
      ],
    });

    const new_data = decodeB58(type, data);

    expect(new_data).toMatchObject({
      prim: "Pair",
      args: [
        {
          string: "KT1CD9M7KgWDQ3RozRfrT82mSuG9W2b7QDFA",
        },
        {
          prim: "Pair",
          args: [
            {
              string: "KT1CD9M7KgWDQ3RozRfrT82mSuG9W2b7QDFA",
            },
            {
              int: "1",
            },
          ],
        },
      ],
    });
  });
});

describe("decodeB58 address on complicated map data structure", () => {
  it("should be present in string representation", () => {
    const instr = p.parseMichelineExpression(
      ` { PUSH (map (pair address address) (list address)) {Elt (Pair 0x015dfb31bce51b9f71200fab36654d50cd877ef39500 0x000044b31e005479eba6449274d8c6dc423946f97607) {0x0000370850c5a8f652ed1063a4b8d902058d08b95b75; 0x000083d72f98dc41baa8b71136f05e2bc1dfd524862f} } }`
    )!;
    const [type, data] = t_data(instr);
    const new_data = decodeB58(type, data);
    expect(JSON.stringify(new_data)).toMatchObject(
      JSON.stringify([
        {
          prim: "Elt",
          args: [
            {
              prim: "Pair",
              args: [
                { string: "KT1H9hKtcqcMHuCoaisu8Qy7wutoUPFELcLm" },
                { string: "tz1RuHDSj9P7mNNhfKxsyLGRDahTX5QD1DdP" },
              ],
            },
            [
              { string: "tz1Qf1pSbJzMN4VtGFfVJRgbXhBksRv36TxW" },
              { string: "tz1Xf8zdT3DbAX9cHw3c3CXh79rc4nK4gCe8" },
            ],
          ],
        },
      ])
    );
  });
});

describe("decodeB58 address on complicated pair data structure", () => {
  it("should be present in string representation", () => {
    const instr = p.parseMichelineExpression(
      ` { PUSH (pair (pair address address) address address) (Pair (Pair 0x015dfb31bce51b9f71200fab36654d50cd877ef39500 0x000044b31e005479eba6449274d8c6dc423946f97607) (Pair 0x0000370850c5a8f652ed1063a4b8d902058d08b95b75 0x000083d72f98dc41baa8b71136f05e2bc1dfd524862f))}`
    )!;
    const [type, data] = t_data(instr);

    const new_data = decodeB58(type, data);
    expect(JSON.stringify(new_data)).toMatchObject(
      JSON.stringify({
        prim: "Pair",
        args: [
          {
            prim: "Pair",
            args: [
              { string: "KT1H9hKtcqcMHuCoaisu8Qy7wutoUPFELcLm" },
              { string: "tz1RuHDSj9P7mNNhfKxsyLGRDahTX5QD1DdP" },
            ],
          },
          {
            prim: "Pair",
            args: [
              { string: "tz1Qf1pSbJzMN4VtGFfVJRgbXhBksRv36TxW" },
              { string: "tz1Xf8zdT3DbAX9cHw3c3CXh79rc4nK4gCe8" },
            ],
          },
        ],
      })
    );
  });
});

describe("test pair for right associative 1", () => {
  it("should be right associative", () => {
    const expr = {
      prim: "pair",
      args: [
        {
          prim: "pair",
          args: [
            {
              prim: "address",
            },
            {
              prim: "address",
            },
          ],
        },
        {
          prim: "address",
        },
        {
          prim: "address",
        },
      ],
    };
    toRightAssociative(expr);
    expect(JSON.stringify(expr)).toMatchObject(
      JSON.stringify({
        prim: "pair",
        args: [
          {
            prim: "pair",
            args: [
              {
                prim: "address",
              },
              {
                prim: "address",
              },
            ],
          },
          {
            prim: "pair",
            args: [
              {
                prim: "address",
              },
              {
                prim: "address",
              },
            ],
          },
        ],
      })
    );
  });
});

describe("test pair for right associative 2", () => {
  it("should be right associative", () => {
    const expr = {
      prim: "pair",
      args: [
        {
          prim: "address",
        },
        {
          prim: "address",
        },
        {
          prim: "address",
        },
        {
          prim: "address",
        },
      ],
    };
    toRightAssociative(expr);
    expect(JSON.stringify(expr)).toMatchObject(
      JSON.stringify({
        prim: "pair",
        args: [
          {
            prim: "address",
          },
          {
            prim: "pair",
            args: [
              {
                prim: "address",
              },
              {
                prim: "pair",
                args: [
                  {
                    prim: "address",
                  },
                  {
                    prim: "address",
                  },
                ],
              },
            ],
          },
        ],
      })
    );
  });
});
