import { version } from "./display";

type contractStorage = { version: version } & {
  balance: string;
  effective_period: string;
  owners: string[];
  proposal_counter: string;
  proposal_map: string;
  threshold: number;
  version: string;
};
export { type contractStorage };
