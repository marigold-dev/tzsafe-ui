import { vi } from "vitest";
import test_suit_0_1_1 from "./v0.1.1";
import test_suit_0_3_3 from "./v0.3.3";
import test_suit_0_3_4 from "./v0.3.4";

vi.mock("@airgap/beacon-sdk", () => ({
  NetworkType: {
    MAINNET: "mainnet",
    GHOSTNET: "ghostnet",
  },
}));

test_suit_0_1_1();
test_suit_0_3_3();
test_suit_0_3_4();
