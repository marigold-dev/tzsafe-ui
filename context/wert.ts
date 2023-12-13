import WertWidget from "@wert-io/widget-initializer";
import { WERT_ID, WERT_URL } from "./config";

export const makeWertWidget = ({
  wallet,
  onSuccess,
}: {
  wallet: string;
  onSuccess: (txId: string) => void;
}) =>
  new WertWidget({
    address: wallet,
    partner_id: WERT_ID,
    origin: WERT_URL,
    network: "ghostnet",
    theme: "dark",
    commodities: '[{"commodity":"XTZ","network":"ghostnet"}]',
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
