type ownersForm =
  | {
      addOwners: string[];
    }
  | { removeOwners: string[] }
  | { changeThreshold: number }
  | { adjustEffectivePeriod: number }
  | { execute_lambda: { metadata?: string; lambda: string } };

export { type ownersForm };
