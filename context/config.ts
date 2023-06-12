import { NetworkType } from "@airgap/beacon-sdk";

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://ghostnet.tezos.marigold.dev/";
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.ghostnet.tzkt.io";
export const IPFS = "https://ipfs-proxy.gcp.marigold.dev";
export const IPFS_NODE = "ipfs.gcp.marigold.dev";
export const PREFERED_NETWORK =
  process.env.NEXT_PUBLIC_NETWORK_TYPE === "mainnet"
    ? NetworkType.MAINNET
    : NetworkType.GHOSTNET;

export const THUMBNAIL_URL = "https://display-thumbs.dipdup.net";

export const DEFAULT_TIMEOUT = 60000;
export const MODAL_TIMEOUT = 2000;
// 10 minutes
export const PROPOSAL_DURATION_WARNING = 600000;

export const MARIGOLD_LOGO_URL =
  "https://uploads-ssl.webflow.com/616ab4741d375d1642c19027/61793ee65c891c190fcaa1d0_Vector(1).png";

export const BROKEN_FA2_ADDRESSES = [
  "KT1H9hKtcqcMHuCoaisu8Qy7wutoUPFELcLm",
  "KT19RSC3s5EzvSTquHnav6JNzgb6ngoh1YUh",
  "KT1UhjCszVyY5dkNUXFGAwdNcVgVe2ZeuPv5",
];
