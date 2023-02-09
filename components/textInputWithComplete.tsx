import { FieldHookConfig, useField } from "formik";
import React, { FC, useContext } from "react";
import { AppStateContext } from "../context/state";
import { Trie } from "../utils/radixTrie";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const TextInputWithCompletion: FC<
  FieldHookConfig<string> & {
    className: string;
    setTerms: ({ payload, term }: { payload: string; term: string }) => void;
    byAddrToo?: boolean;
    filter: (x: any) => boolean;
  }
> = (props) => {
  const [field, _, helpers] = useField(props);
  const state = useContext(AppStateContext)!;
  // Show inline feedback if EITHER
  // - the input is focused AND value is longer than 2 characters
  // - or, the has been visited (touched === true)
  const [visible, setVisible] = React.useState(false);

  const handleFocus = (e: any) => {
    setVisible(true);
  };
  const handleBLur = async (e: any) => {
    let __ = await sleep(250);
    setVisible(false);
    field.onBlur(e);
  };
  let shouldShow = visible && field.value.trim().length > 0;
  let completions = state.aliasTrie.GetTopkTermsForPrefix(field.value, 10, 0);
  if (props.byAddrToo) {
    let tree = new Trie();
    Object.entries(state.aliases).forEach(([k, v]) => tree.addTerm(k, v));
    let compl = tree.GetTopkTermsForPrefix(field.value, 10, 0) as any;
    completions = completions.concat(
      compl.map((x: any) => ({ term: x.payload, payload: x.term }))
    );
  }
  completions = completions.filter((x) => props.filter(x.payload));
  return (
    <div className="w-full">
      <input
        autoComplete="false"
        className={props.className + " relative "}
        {...field}
        onFocus={handleFocus}
        onBlur={handleBLur}
      />
      {shouldShow && completions.length > 0 && (
        <div className="text-xs absolute xz-20 bg-white w-full border-2 h-36 grid gap-2 grid-flow-row row-auto grid-cols-1 break-words overflow-y-auto">
          {completions.map((x) => {
            return (
              <button
                className="block z-50 text-md p-2 bg-white hover:bg-slate-300 w-full text-left text-black"
                key={x.term}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  props.setTerms(x);
                }}
              >
                {x.term}
                <p className="text-gray text-sm">{x.payload}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default TextInputWithCompletion;
