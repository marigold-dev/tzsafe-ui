const Footer = (_: React.PropsWithChildren) => {
  return (
    <footer className=" bottom-0 max-h-96 w-full grow-0 border-t-4 border-gray bg-dark text-center lg:text-left">
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
