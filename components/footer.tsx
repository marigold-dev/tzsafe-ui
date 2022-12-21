const Footer = (_: React.PropsWithChildren) => {
  return (
    <footer className=" border-gray border-t-4 bg-dark text-center bottom-0 w-full lg:text-left grow-0">
      <div
        className="text-white text-center p-4 flex flex-col"
      >
        <span className=" text-white">© 2022 Copyright </span>
        <a className=" text-white" href="https://www.marigold.dev/">
          Marigold
        </a>
      </div>
    </footer>
  );
};
export default Footer;
