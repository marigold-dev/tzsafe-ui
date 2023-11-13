import WertWidget from "@wert-io/widget-initializer";
import { signSmartContractData } from "@wert-io/widget-sc-signer";

const privateKey = "";

export const makeWertWidget = ({
  wallet,
  contract,
}: {
  wallet: string;
  contract: string;
}) => {
  const signedData = signSmartContractData(
    {
      address: wallet,
      commodity: "XTZ",
      network: "ghostnet",
      commodity_amount: 0,
      sc_address: contract,
      sc_input_data: "",
    },
    privateKey
  );

  return new WertWidget({
    ...signedData,
    partner_id: "01HBARVR2HGGY24WC52R4J89R8",
    origin: "https://sandbox.wert.io",
    network: "ghostnet",
    theme: "dark",
    commodities:
      '[{"commodity":"XTZ","network":"ghostnet"},{"commodity":"ATF","network":"ghostnet"},{"commodity":"DOGA","network":"ghostnet"},{"commodity":"EURL","network":"ghostnet"}]',
    lang: "en",
    widgetLayoutMode: "Modal",
  });
};
