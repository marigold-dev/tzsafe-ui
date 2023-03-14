import React, { useEffect } from "react";
import ReactDOM from "react-dom";

function Modal(props: React.PropsWithChildren<{ opened: boolean }>) {
  useEffect(() => {
    document.body.style.overflow = props.opened ? "hidden" : "";
  }, [props.opened]);
  return props.opened
    ? ReactDOM.createPortal(
        <div className="fixed top-0 left-0 right-0 bottom-0 z-50 flex h-fit min-h-full grow items-center justify-center bg-black bg-slate-800 bg-opacity-70 md:top-20 md:left-72">
          <div
            className={
              "min-h-96 absolute top-8 left-4 bottom-8 right-4 overflow-y-auto rounded bg-graybg px-4 py-12 md:top-1/2 md:left-12 md:right-auto md:bottom-auto md:h-fit md:w-2/3 md:translate-x-1/4 md:-translate-y-2/3 md:px-8"
            }
          >
            {props.children}
          </div>
        </div>,
        document.getElementById("modal")!
      )
    : null;
}
export default Modal;
