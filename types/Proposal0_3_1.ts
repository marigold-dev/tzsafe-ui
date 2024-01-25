import { MichelsonType, Expr } from "@taquito/michel-codec";
import { Schema } from "@taquito/michelson-encoder";
import { MichelsonMap } from "@taquito/taquito";
import { BigNumber } from "bignumber.js";

type content =
  | {
      execute_lambda: {
        metadata?: string | { Some: string };
        lambda: string | Array<Expr>;
      };
    }
  | { transfer: { amount: number; target: string; parameter: {} } }
  | { add_owners: string[] }
  | { remove_owners: string[] }
  | { adjust_threshold: number }
  | { adjust_effective_period: number };

type proposal = {
  signatures: MichelsonMap<string, boolean>;
  contents: content[];
  executed: boolean;
  state:
    | { rejected: Symbol }
    | { executed: Symbol }
    | { proposing: Symbol }
    | { expired: Symbol };
  proposer: { actor: string; timestamp: string };
};

type contractStorage = {
  proposal_counter: BigNumber;
  balance: string;
  effective_period: number;
  proposals: string;
  owners: string[];
  archives: string;
  threshold: BigNumber;
  version: "0.3.1";
};

export const eventType: MichelsonType = {
  prim: "pair",
  args: [
    {
      prim: "or",
      args: [
        {
          prim: "or",
          args: [
            { prim: "unit", annots: ["%executed"] },
            { prim: "unit", annots: ["%expired"] },
          ],
        },
        {
          prim: "or",
          args: [
            { prim: "unit", annots: ["%proposing"] },
            { prim: "unit", annots: ["%rejected"] },
          ],
        },
      ],
      annots: ["%state"],
    },
    {
      prim: "map",
      args: [{ prim: "address" }, { prim: "bool" }],
      annots: ["%signatures"],
    },
    {
      prim: "pair",
      args: [
        { prim: "address", annots: ["%actor"] },
        { prim: "timestamp", annots: ["%timestamp"] },
      ],
      annots: ["%proposer"],
    },
    {
      prim: "option",
      args: [
        {
          prim: "pair",
          args: [
            { prim: "address", annots: ["%actor"] },
            { prim: "timestamp", annots: ["%timestamp"] },
          ],
        },
      ],
      annots: ["%resolver"],
    },
    {
      prim: "list",
      args: [
        {
          prim: "or",
          args: [
            {
              prim: "or",
              args: [
                {
                  prim: "or",
                  args: [
                    {
                      prim: "set",
                      args: [{ prim: "address" }],
                      annots: ["%add_owners"],
                    },
                    { prim: "int", annots: ["%adjust_effective_period"] },
                  ],
                },
                {
                  prim: "or",
                  args: [
                    { prim: "nat", annots: ["%adjust_threshold"] },
                    {
                      prim: "pair",
                      args: [
                        {
                          prim: "lambda",
                          args: [
                            { prim: "unit" },
                            { prim: "list", args: [{ prim: "operation" }] },
                          ],
                          annots: ["%lambda"],
                        },
                        {
                          prim: "option",
                          args: [{ prim: "bytes" }],
                          annots: ["%metadata"],
                        },
                      ],
                      annots: ["%execute_lambda"],
                    },
                  ],
                },
              ],
            },
            {
              prim: "or",
              args: [
                {
                  prim: "set",
                  args: [{ prim: "address" }],
                  annots: ["%remove_owners"],
                },
                {
                  prim: "pair",
                  args: [
                    { prim: "address", annots: ["%target"] },
                    { prim: "mutez", annots: ["%amount"] },
                  ],
                  annots: ["%transfer"],
                },
              ],
            },
          ],
        },
      ],
      annots: ["%contents"],
    },
  ],
};

export const proposalsType: MichelsonType = {
  prim: "list",
  args: [
    {
      prim: "or",
      args: [
        {
          prim: "or",
          args: [
            {
              prim: "or",
              args: [
                {
                  prim: "set",
                  args: [
                    {
                      prim: "address",
                    },
                  ],
                  annots: ["%add_owners"],
                },
                {
                  prim: "int",
                  annots: ["%adjust_effective_period"],
                },
              ],
            },
            {
              prim: "or",
              args: [
                {
                  prim: "nat",
                  annots: ["%adjust_threshold"],
                },
                {
                  prim: "pair",
                  args: [
                    {
                      prim: "lambda",
                      args: [
                        {
                          prim: "unit",
                        },
                        {
                          prim: "list",
                          args: [
                            {
                              prim: "operation",
                            },
                          ],
                        },
                      ],
                      annots: ["%lambda"],
                    },
                    {
                      prim: "option",
                      args: [
                        {
                          prim: "bytes",
                        },
                      ],
                      annots: ["%metadata"],
                    },
                  ],
                  annots: ["%execute_lambda"],
                },
              ],
            },
          ],
        },
        {
          prim: "or",
          args: [
            {
              prim: "set",
              args: [
                {
                  prim: "address",
                },
              ],
              annots: ["%remove_owners"],
            },
            {
              prim: "pair",
              args: [
                {
                  prim: "address",
                  annots: ["%target"],
                },
                {
                  prim: "mutez",
                  annots: ["%amount"],
                },
              ],
              annots: ["%transfer"],
            },
          ],
        },
      ],
    },
  ],
};

export const arrayProposalSchema = new Schema(proposalsType);
export const proofOfEventSchema = new Schema(eventType);

export { type content, type proposal, type contractStorage };
