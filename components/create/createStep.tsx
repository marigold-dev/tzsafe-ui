import React, { useContext } from "react";
import FormContext from "../../context/formContext";
import Basic from "./basic";
import Success from "./createLoader";
import Settings from "./settings";

function CreateStep() {
  const { activeStepIndex } = useContext(FormContext)!;

  return (
    <div className="mt-8 w-full">
      {(() => {
        switch (activeStepIndex) {
          case 0:
            return <Basic />;
          case 1:
            return <Settings />;
          case 2:
            return <Success />;
          default:
            return null;
        }
      })()}
    </div>
  );
}

export default CreateStep;
