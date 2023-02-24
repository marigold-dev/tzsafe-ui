const Footer = ({
  shouldRemovePadding,
}: React.PropsWithChildren<{ shouldRemovePadding: boolean }>) => {
  return (
    <footer
      className={`absolute bottom-0 left-0 right-0 h-28 border-t-4 border-zinc-500 bg-dark text-center ${
        shouldRemovePadding ? "" : "md:left-72"
      } lg:text-left`}
    >
      <div className="flex flex-col p-4 text-center text-white">
        <span className=" text-white">
          © {new Date().getFullYear()} Copyright{" "}
        </span>
        <a className=" text-white" href="https://www.marigold.dev/">
          Marigold
        </a>
        <a className=" text-white" href="https://tzkt.io/">
          Powered by TzKT API
        </a>
      </div>
    </footer>
  );
};
export default Footer;
