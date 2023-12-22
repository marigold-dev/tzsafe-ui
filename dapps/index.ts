import { ReactNode } from "react";
import { transaction } from "../components/RenderProposalContentLambda";
import { tezosDomains } from "./tezosDomains";

export type contracts = {
  mainnet: { [k: string]: true };
  ghostnet: { [k: string]: true };
};

export type CustomViewData = {
  image?: string;
  action: string;
  description: ReactNode;
  price?: string;
  link?: string;
};
export type CustomView =
  | {
      logo: string;
      logoAlt: string;
      logoLink: string;
      label: string;
      data: Array<CustomViewData> | undefined;
    }
  | { logo: undefined; label: undefined; data: undefined }
  | undefined;

export const customViewMatchers: Array<
  (transactions: Array<transaction>) => CustomView
> = [tezosDomains];
