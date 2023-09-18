import { validateAddress, ValidationResult } from "@taquito/utils";
import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  if (!params || !params.walletAddress || Array.isArray(params.walletAddress))
    return { notFound: true };

  if (validateAddress(params.walletAddress) !== ValidationResult.VALID)
    return { notFound: true };

  return {
    redirect: {
      destination: `/${params.walletAddress}/proposals`,
      permanent: true,
    },
  };
};

export default function WalletAddressIndex() {
  return null;
}
