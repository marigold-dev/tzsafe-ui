import { FieldHookConfig, useField } from "formik";
import React, { FC, useContext } from "react";
import { AppStateContext } from "../context/state";
import { Trie } from "../utils/radixTrie";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const TextInputWithCompletion: FC<
  FieldHookConfig<string> & {
    className: string;
    setTerms: ({ payload, term }: { payload: string; term: string }) => void;
    byAddrToo?: boolean;
    filter: (x: any) => boolean;
    placeholder?: string;
    onOwnBlur?: (v: string) => any;
    onOwnChange?: (v: string) => any;
  }
> = props => {
  const [field, _, helpers] = useField(props);
  const state = useContext(AppStateContext)!;
  // Show inline feedback if EITHER
  // - the input is focused AND value is longer than 2 characters
  // - or, the has been visited (touched === true)
  const [visible, setVisible] = React.useState(false);

  const handleFocus = (e: any) => {
    setVisible(true);
  };
  const handleBLur = (e: any) => {
    props.onOwnBlur?.(e.target.value);
    // let __ = await sleep(250);
    // setVisible(false);
    // field.onBlur(e);
  };
  // let shouldShow = visible && field.value.trim().length > 0;
  let completions = state.aliasTrie.GetTopkTermsForPrefix(field.value, 10, 0);
  if (props.byAddrToo) {
    let tree = new Trie();
    Object.entries(state.aliases).forEach(([k, v]) => tree.addTerm(k, v));
    let compl = tree.GetTopkTermsForPrefix(field.value, 10, 0) as any;
    completions = completions.concat(
      compl.map((x: any) => ({ term: x.payload, payload: x.term }))
    );
  }
  completions = completions.filter(x => props.filter(x.payload));
  return (
    <div className="relative w-full">
      <input
        autoComplete="false"
        className={props.className + " relative rounded"}
        // {...field}
        onFocus={handleFocus}
        onBlur={handleBLur}
        placeholder={props.placeholder}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          props.onOwnChange?.(e.target.value)
        }
      />
      {
        //shouldShow && completions.length > 0 && (
        // <div className="xz-20 absolute row-auto grid h-36 w-full grid-flow-row grid-cols-1 gap-2 overflow-y-auto break-words border-2 bg-white text-xs">
        //   {completions.map(x => {
        //     return (
        //       <button
        //         className="text-md z-50 block w-full bg-white p-2 text-left text-black hover:bg-slate-300"
        //         key={x.term}
        //         type="button"
        //         onClick={e => {
        //           e.preventDefault();
        //           props.setTerms(x);
        //         }}
        //       >
        //         {x.term}
        //         <p className="text-gray text-sm">{x.payload}</p>
        //       </button>
        //     );
        //   })}
        // </div>
        //)
      }
    </div>
  );
};
export default TextInputWithCompletion;
