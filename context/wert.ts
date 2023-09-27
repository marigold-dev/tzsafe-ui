import WertWidget from "@wert-io/widget-initializer";

export const makeWertWidget = (address: string) =>
  new WertWidget({
    partner_id: "01HBARVR2HGGY24WC52R4J89R8",
    origin: "https://sandbox.wert.io",
    network: "tezos",
    address,
    theme: "dark",
    commodities:
      '[{"commodity":"XTZ","network":"ghostnet"},{"commodity":"ATF","network":"ghostnet"},{"commodity":"DOGA","network":"ghostnet"},{"commodity":"EURL","network":"ghostnet"}]',
    lang: "en",
    widgetLayoutMode: "Modal",
  });
