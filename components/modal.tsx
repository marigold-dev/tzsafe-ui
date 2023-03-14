import React from "react";
import ReactDOM from "react-dom";

function Modal(props: React.PropsWithChildren<{ opened: boolean }>) {
  return props.opened
    ? ReactDOM.createPortal(
        <div className="overflow-y-none fixed top-8 left-0 right-0 bottom-0 z-10 flex h-fit min-h-full grow items-center justify-center bg-slate-800 bg-opacity-70 px-4 py-8 md:left-72">
          <div className="min-h-96 relative flex h-fit w-full items-center justify-center  overflow-y-auto rounded bg-graybg px-10 py-4 md:h-fit md:w-2/3">
            {props.children}
          </div>
        </div>,
        document.getElementById("modal")!
      )
    : null;
}
export default Modal;
