import * as Ariakit from "@ariakit/react";
import { useState } from "react";
import Spinner from "./Spinner";

type option<T> = T & { id: string; value: string; label: string };
type props<T> = {
  label: string;
  placeholder?: string;
  onChange: (value: T) => void;
  onSearch: (value: string) => void;
  options: option<T>[];
  value: option<T> | undefined;
  loading?: boolean;
  withSeeMore?: boolean;
  onBlur?: () => void;
  onSeeMore?: () => void;
  renderOption?: (option: option<T>) => React.ReactNode;
  className?: string;
  error?: string;
  clearInputOnClose?: boolean;
};

const Select = <T,>({
  label,
  onChange,
  onSearch,
  options,
  value,
  renderOption,
  onSeeMore,
  onBlur,
  className,
  placeholder,
  error,
  loading = false,
  withSeeMore = false,
  clearInputOnClose = false,
}: props<T>) => {
  const [searchValue, setSearchValue] = useState("");

  const select = Ariakit.useSelectStore({
    sameWidth: true,
    gutter: 0,
    value: value?.id ?? "-1",
    setValue(value) {
      const newToken = options.find(token => token.id === value);

      if (!newToken) return;

      onChange(newToken);
    },
    setOpen(open) {
      if (!open) onBlur?.();
      if (!!clearInputOnClose) setSearchValue("");
    },
  });

  return (
    <div className={`relative w-full text-white ${className ?? ""}`}>
      <Ariakit.SelectLabel store={select}>{label}</Ariakit.SelectLabel>
      <Ariakit.Select
        store={select}
        className={`${
          !!label ? "mt-1" : ""
        } flex w-full items-center justify-between rounded bg-zinc-700 p-2 text-sm text-white hover:bg-zinc-600`}
      >
        {!!value ? (
          renderOption?.(value) ?? <div>{value.label}</div>
        ) : (
          <div className="text-zinc-300">
            {placeholder ?? "Please select an item"}
          </div>
        )}
        <Ariakit.SelectArrow />
      </Ariakit.Select>
      <Ariakit.SelectPopover
        store={select}
        className="relative mt-1 max-h-52 space-y-1 overflow-y-auto overscroll-contain rounded bg-zinc-700"
        style={{ zIndex: 2 }}
      >
        <div className="sticky top-0 z-[1] bg-zinc-700 px-2 pt-2">
          <input
            type="text"
            className=" mb-2 w-full rounded px-2 py-1 text-sm text-zinc-900"
            placeholder="Search"
            onChange={e => {
              setSearchValue(e.target.value);
              onSearch(e.target.value);
            }}
            value={searchValue}
          />
        </div>
        {loading ? (
          <div className="flex h-full w-full items-center justify-center p-2">
            <Spinner />
          </div>
        ) : (
          <div className="space-y-2 px-2 pb-2">
            {!!error ? (
              <p className="py-2 text-center text-red-500">{error}</p>
            ) : options.length === 0 ? (
              <p className="py-2 text-center text-zinc-500">No result</p>
            ) : (
              options.map(v => (
                <Ariakit.SelectItem
                  key={v.id}
                  className="combobox-item cursor-pointer rounded p-2"
                  value={v.value}
                  setValueOnClick
                >
                  {renderOption?.(v) ?? v.label}
                </Ariakit.SelectItem>
              ))
            )}
          </div>
        )}

        {withSeeMore && (
          <div className="flex items-center justify-center p-2 pb-4">
            <button
              onClick={onSeeMore}
              type="button"
              className="rounded bg-primary px-2 py-1 text-sm hover:bg-red-600"
            >
              More
            </button>
          </div>
        )}
      </Ariakit.SelectPopover>
    </div>
  );
};

export default Select;
