import Link from "next/link";

export default function Custom404() {
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
