import WertWidget from "@wert-io/widget-initializer";

export const makeWertWidget = ({
  wallet,
  onSuccess,
}: {
  wallet: string;
  onSuccess: (txId: string) => void;
}) => {
  // console.log(generateInputData(contract, tezToMutez(10)));
  // const signedData = signSmartContractData(
  //   {
  //     address: wallet,
  //     commodity: "XTZ",
  //     network: "ghostnet",
  //     commodity_amount: 10,
  //     sc_address: contract,
  //     sc_input_data: generateInputData(contract, tezToMutez(10)),
  //   },
  //   privateKey
  // );

  return new WertWidget({
    address: wallet,
    partner_id: "01HBARVR2HGGY24WC52R4J89R8",
    origin: "https://sandbox.wert.io",
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
};
