type versionedStorage =
  | { version: "0.0.6" }
  | { version: "0.0.8" }
  | { version: "unknown version" };

type contractStorage = versionedStorage & {
  [key: string]: any;
  balance: string;
  threshold: number;
};
export { type contractStorage };
