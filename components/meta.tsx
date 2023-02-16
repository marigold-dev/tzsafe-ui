import Head from "next/head";
import { FC } from "react";

const Meta: FC<{ title: string }> = ({ title }) => (
  <Head>
    <title>{title}</title>
    <meta name="viewport" content="initial-scale=1.0, width=device-width" />
  </Head>
);

export default Meta;
