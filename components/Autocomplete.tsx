import * as Ariakit from "@ariakit/react";
import { useRef, useState } from "react";
import Spinner from "./Spinner";

type props = {
  label: string;
  onChange: (value: string) => void;
  options: { id: string; value: string }[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  loading?: boolean;
};

const Autocomplete = ({
  label,
  onChange,
  options,
  placeholder,
  value,
  defaultValue,
  loading = false,
}: props) => {
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
    <div className="px-2 text-white">
      <label>
        {label}
        <Ariakit.Combobox
          store={combobox}
          placeholder={placeholder}
          className="block rounded p-2 text-sm text-zinc-800"
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
            .map(({ id, value }) => (
              <Ariakit.ComboboxItem
                key={id}
                className="combobox-item rounded p-1"
                value={value}
              >
                {value}
              </Ariakit.ComboboxItem>
            ))
        )}
      </Ariakit.ComboboxPopover>
    </div>
  );
};

export default Autocomplete;
