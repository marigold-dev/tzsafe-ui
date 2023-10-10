import { Parser } from "@taquito/michel-codec";
import WertWidget from "@wert-io/widget-initializer";
import { signSmartContractData } from "@wert-io/widget-sc-signer";
import { tezToMutez } from "../utils/tez";

const privateKey = "";

// const parser = new Parser();

function generateInputData(contract: string, mutez: number) {
  // const string = JSON.stringify({
  //   entrypoint: "default",
  //   value: {
  //     prim: "Unit",
  //   },
  // });

  // JSON.stringify(parser.parseMichelineExpression(string))
  return Array.from(
    new TextEncoder().encode(
      JSON.stringify({ entrypoint: "default", value: { prim: "Unit" } })
    )
  )
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

export const makeWertWidget = ({
  wallet,
  contract,
}: {
  wallet: string;
  contract: string;
}) => {
  console.log(generateInputData(contract, tezToMutez(10)));
  const signedData = signSmartContractData(
    {
      address: wallet,
      commodity: "XTZ",
      network: "ghostnet",
      commodity_amount: 10,
      sc_address: contract,
      sc_input_data: generateInputData(contract, tezToMutez(10)),
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
