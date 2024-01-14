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
  | { adjust_effective_period: number }
  | { add_or_update_metadata: { key: string; value: string } }
  | { remove_metadata: string };

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
  version: "0.3.3";
};

export const proposalType: MichelsonType = {
  prim: "pair",
  args: [
    {
      prim: "or",
      args: [
        {
          prim: "or",
          args: [
            {
              prim: "unit",
              annots: ["%executed"],
            },
            {
              prim: "unit",
              annots: ["%expired"],
            },
          ],
        },
        {
          prim: "or",
          args: [
            {
              prim: "unit",
              annots: ["%proposing"],
            },
            {
              prim: "unit",
              annots: ["%rejected"],
            },
          ],
        },
      ],
      annots: ["%state"],
    },
    {
      prim: "map",
      args: [
        {
          prim: "address",
        },
        {
          prim: "bool",
        },
      ],
      annots: ["%signatures"],
    },
    {
      prim: "pair",
      args: [
        {
          prim: "address",
          annots: ["%actor"],
        },
        {
          prim: "timestamp",
          annots: ["%timestamp"],
        },
      ],
      annots: ["%proposer"],
    },
    {
      prim: "option",
      args: [
        {
          prim: "pair",
          args: [
            {
              prim: "address",
              annots: ["%actor"],
            },
            {
              prim: "timestamp",
              annots: ["%timestamp"],
            },
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
                      prim: "pair",
                      args: [
                        {
                          prim: "string",
                          annots: ["%key"],
                        },
                        {
                          prim: "bytes",
                          annots: ["%value"],
                        },
                      ],
                      annots: ["%add_or_update_metadata"],
                    },
                    {
                      prim: "set",
                      args: [
                        {
                          prim: "address",
                        },
                      ],
                      annots: ["%add_owners"],
                    },
                  ],
                },
                {
                  prim: "or",
                  args: [
                    {
                      prim: "int",
                      annots: ["%adjust_effective_period"],
                    },
                    {
                      prim: "nat",
                      annots: ["%adjust_threshold"],
                    },
                  ],
                },
              ],
            },
            {
              prim: "or",
              args: [
                {
                  prim: "or",
                  args: [
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
                    {
                      prim: "string",
                      annots: ["%remove_metadata"],
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
        },
      ],
      annots: ["%contents"],
    },
  ],
};

export const archiveProposalSchema = new Schema(proposalType);

export { type content, type proposal, type contractStorage };
