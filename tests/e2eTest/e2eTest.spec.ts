import { InMemorySigner } from "@taquito/signer";
import { TezosToolkit } from "@taquito/taquito";
import { vi } from "vitest";
import { pb, rpc } from "./config";
import test_suit_0_1_1 from "./v0.1.1";
import test_suit_0_3_3 from "./v0.3.3";
import test_suit_0_3_4 from "./v0.3.4";

vi.mock("@airgap/beacon-sdk", () => ({
  NetworkType: {
    MAINNET: "mainnet",
    GHOSTNET: "ghostnet",
  },
}));

function setTezosToolkit(tezos: TezosToolkit) {
  tezos = new TezosToolkit(rpc);
  tezos.setProvider({
    signer: new InMemorySigner(pb),
  });
  return tezos;
}

test_suit_0_1_1(setTezosToolkit);
test_suit_0_3_3(setTezosToolkit);
test_suit_0_3_4(setTezosToolkit);
