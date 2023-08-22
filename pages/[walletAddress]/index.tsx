import { useRouter } from "next/router";
import { useEffect } from "react";

const Index = () => {
  const router = useRouter();

  useEffect(() => {
    if (!router.query.walletAddress) return;
    if (Array.isArray(router.query.walletAddress)) return;

    router.replace(`${router.query.walletAddress}/proposals`);
  }, [router]);

  return null;
};

export default Index;
