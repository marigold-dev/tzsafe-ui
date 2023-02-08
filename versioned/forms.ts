type ownersForm =
  | {
      addOwners: string[];
    }
  | { removeOwners: string[] }
  | { changeThreshold: number }
  | { adjustEffectivePeriod: number };
export { type ownersForm };
