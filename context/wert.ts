import { NetworkType } from "@airgap/beacon-sdk";
import WertWidget from "@wert-io/widget-initializer";
import { PREFERED_NETWORK, WERT_ID, WERT_URL } from "./config";

export const makeWertWidget = ({
  wallet,
  onSuccess,
}: {
  wallet: string;
  onSuccess: (txId: string) => void;
}) => {
  const network =
    PREFERED_NETWORK === NetworkType.MAINNET ? "tezos" : "ghostnet";
  return new WertWidget({
    address: wallet,
    partner_id: WERT_ID,
    origin: WERT_URL,
    network,
    theme: "dark",
    commodities: `[{"commodity":"XTZ","network":"${network}"}]`,
    commodity: "XTZ",
    lang: "en",
    widgetLayoutMode: "Modal",
    listeners: {
      "payment-status": ({
        status,
        tx_id,
      }: {
        status: string;
        tx_id: string;
      }) => {
        if (status !== "success") return;

        onSuccess(tx_id);
      },
    },
  });
};
