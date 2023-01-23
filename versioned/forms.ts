type ownersForm =
  | {
      addOwners: string[];
    }
  | { removeOwners: string[] }
  | { changeThreshold: number };

export { type ownersForm };
