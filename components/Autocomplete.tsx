import * as Ariakit from "@ariakit/react";
import { useState } from "react";
import Spinner from "./Spinner";

type props<T> = {
  label: string;
  onChange: (value: string) => void;
  options: (T & { id: string; value: string })[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  loading?: boolean;
  renderOption?: (option: T & { id: string; value: string }) => React.ReactNode;
};

const Autocomplete = <T,>({
  label,
  onChange,
  options,
  placeholder,
  value,
  defaultValue,
  renderOption,
  loading = false,
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
        className="mt-1 rounded bg-zinc-700 p-2"
      >
        {loading ? (
          <div className="flex h-full w-full items-center justify-center p-2">
            <Spinner />
          </div>
        ) : (
          options
            .filter(({ value }) =>
              value.toLowerCase().includes(currentValue.toLowerCase())
            )
            .map(v => (
              <Ariakit.ComboboxItem
                key={v.id}
                className="combobox-item cursor-pointer rounded p-2"
                value={v.value}
              >
                {renderOption?.(v) ?? v.value}
              </Ariakit.ComboboxItem>
            ))
        )}
      </Ariakit.ComboboxPopover>
    </div>
  );
};

export default Autocomplete;
