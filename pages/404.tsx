import Link from "next/link";
import { useRouter } from "next/router";

/**
 * Inject the different path possible under [walletAddress]
 */
export async function getStaticProps() {
  const fs = require("fs");
  const walletPaths = fs
    .readdirSync("./pages/[walletAddress]/")
    .map((page: string) => page.replace(".tsx", ""));

  return {
    props: {
      walletPaths,
    },
  };
}

export default function Custom404(props: any) {
  const router = useRouter();
  const path = router.asPath;
  let [_, address, page] = path.split("/");
  page = page || "index"; // page value can be undefined
  // If the page match /KT1..../{dashboard|index|anything under [walletAddress]} we redirect
  // This hack only works if the http server redirect to 404.html when the page is not found
  // Fortunately it's the case of github-page
  if (
    address &&
    address.startsWith("KT1") &&
    props.walletPaths.includes(page)
  ) {
    router.push(path);
  }

  return (
    <section
      className="flex flex-col items-center justify-center text-center text-white"
      style={{
        height: "calc(100vh - 12rem)",
      }}
    >
      <h1>404 - Page not found</h1>
      <Link
        href="/"
        className="mt-4 rounded bg-primary px-4 py-2 text-white hover:bg-red-500"
      >
        Go to home
      </Link>
    </section>
  );
}
