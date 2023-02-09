import React from "react";
import ReactDOM from "react-dom";

function Modal(props: React.PropsWithChildren<{ opened: boolean }>) {
  return props.opened
    ? ReactDOM.createPortal(
        <div className="bg-slate-800 bg-opacity-70 absolute h-fit top-0 left-0 right-0 bottom-0 flex justify-center items-center z-10 overflow-y-none">
          <div className="bg-graybg px-10 py-4 h-fit w-1/2 md:w-1/2 min-h-96  flex justify-center items-center relative md:h-fit overflow-y-auto ">
            {props.children}
          </div>
        </div>,
        document.getElementById("modal")!
      )
    : null;
}
export default Modal;
