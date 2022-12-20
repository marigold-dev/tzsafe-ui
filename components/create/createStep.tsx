import React, { useContext } from "react";
import FormContext from "../../context/formContext";
import Aliases from "./aliases";
import Basic from "./basic";
import Success from "./createLoader";

function CreateStep() {
    const { activeStepIndex } = useContext(FormContext)!;
    let stepContent = null;
    switch (activeStepIndex) {
        case 0:
            stepContent = <Basic />;
            break;
        case 1:
            stepContent = <Aliases />;
            break;
        case 2:
            stepContent = <Success />
            break;
        default:
            break;
    }

    return stepContent;
}

export default CreateStep;
