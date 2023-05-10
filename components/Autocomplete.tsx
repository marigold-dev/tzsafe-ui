import * as Ariakit from "@ariakit/react";
import { useState } from "react";
import Spinner from "./Spinner";

type props<T> = {
  label: string;
  onChange: (value: string) => void;
  options: (T & { id: string; value: string; label: string })[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  loading?: boolean;
  withSeeMore?: boolean;
  onSeeMore?: () => void;
  renderOption?: (
    option: T & { id: string; value: string; label: string }
  ) => React.ReactNode;
};

const Autocomplete = <T,>({
  label,
  onChange,
  options,
  placeholder,
  value,
  defaultValue,
  renderOption,
  onSeeMore,
  loading = false,
  withSeeMore = false,
}: props<T>) => {
  const [currentValue, setCurrentValue] = useState(() => "");

  const combobox = Ariakit.useComboboxStore({
    gutter: 0,
    sameWidth: true,
    value,
    defaultValue,
    setValue(value) {
      setCurrentValue(value);
      onChange(value);
    },
  });

  return (
    <div className="relative z-10 w-full text-white">
      <label>
        {label}
        <Ariakit.Combobox
          store={combobox}
          placeholder={placeholder}
          className="block w-full rounded p-2 text-sm text-zinc-800"
        />
      </label>
      <Ariakit.ComboboxPopover
        store={combobox}
        className="mt-1 max-h-52 overflow-y-auto overscroll-contain rounded bg-zinc-700 p-2"
      >
        {loading ? (
          <div className="flex h-full w-full items-center justify-center p-2">
            <Spinner />
          </div>
        ) : (
          options
            .filter(({ label }) =>
              label.toLowerCase().includes(currentValue.toLowerCase())
            )
            .map(v => (
              <Ariakit.ComboboxItem
                key={v.id}
                className="combobox-item cursor-pointer rounded p-2"
                value={v.value}
                setValueOnClick
              >
                {renderOption?.(v) ?? v.label}
              </Ariakit.ComboboxItem>
            ))
        )}
        {withSeeMore && (
          <div className="mt-2 flex items-center justify-center">
            <button
              onClick={onSeeMore}
              type="button"
              className="rounded bg-primary px-2 py-1 text-sm hover:bg-red-600"
            >
              More
            </button>
          </div>
        )}
      </Ariakit.ComboboxPopover>
    </div>
  );
};

export default Autocomplete;
