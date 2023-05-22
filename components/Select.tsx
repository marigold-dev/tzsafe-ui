import * as Ariakit from "@ariakit/react";
import { CheckIcon } from "@radix-ui/react-icons";
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
  onSeeMore?: () => void;
  renderOption?: (option: option<T>) => React.ReactNode;
  className?: string;
};

const Select = <T,>({
  label,
  onChange,
  onSearch,
  options,
  value,
  renderOption,
  onSeeMore,
  className,
  placeholder,
  loading = false,
  withSeeMore = false,
}: props<T>) => {
  const select = Ariakit.useSelectStore({
    sameWidth: true,
    gutter: 0,
    value: value?.id ?? "-1",
    setValue(value) {
      const newToken = options.find(token => token.id === value);

      if (!newToken) return;

      onChange(newToken);
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
              onSearch(e.target.value);
            }}
          />
        </div>
        {loading ? (
          <div className="flex h-full w-full items-center justify-center p-2">
            <Spinner />
          </div>
        ) : (
          <div className="space-y-2 px-2 pb-2">
            {options.length === 0 ? (
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
