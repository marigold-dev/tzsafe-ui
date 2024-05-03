import React, { useContext, useEffect } from "react";
import ReactDOM from "react-dom";
import { AppStateContext } from "../context/state";

function Modal(props: React.PropsWithChildren<{ opened: boolean }>) {
  const state = useContext(AppStateContext)!;

  useEffect(() => {
    document.body.style.overflow = props.opened ? "hidden" : "";
  }, [props.opened]);
  return props.opened
    ? ReactDOM.createPortal(
        <div
          className={`fixed bottom-0 left-0 right-0 top-0 z-50 flex grow items-center justify-center bg-black bg-slate-800 bg-opacity-70 md:left-72 md:top-20`}
        >
          <div
            className={
              "min-h-96 absolute bottom-8 left-4 right-4 top-8 h-fit overflow-y-auto rounded bg-graybg px-4 py-12 md:bottom-8 md:left-1 md:right-auto md:top-8 md:max-h-[90%] md:w-[97%] md:translate-x-[1%] md:px-12"
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
