import { Expr } from "@taquito/michel-codec";

type ownersForm =
  | {
      addOwners: string[];
    }
  | { removeOwners: string[] }
  | { changeThreshold: number }
  | { adjustEffectivePeriod: number }
  | { execute_lambda: { metadata?: string; lambda: Expr | null } };

export { type ownersForm };
