import * as Ariakit from "@ariakit/react";
import { CheckIcon } from "@radix-ui/react-icons";
import Spinner from "./Spinner";

type props<T> = {
  label: string;
  onChange: (value: string) => void;
  options: (T & { id: string; value: string; label: string })[];
  value: string;
  defaultValue?: string;
  placeholder?: string;
  loading?: boolean;
  withSeeMore?: boolean;
  selected?: boolean;
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
  selected = false,
}: props<T>) => {
  const combobox = Ariakit.useComboboxStore({
    gutter: 0,
    sameWidth: true,
    value,
    defaultValue,
    setValue(value) {
      onChange(value);
    },
  });

  return (
    <div className="relative z-[1] w-full text-white">
      <label className="relative">
        {label}
        <div className="relative">
          <Ariakit.Combobox
            store={combobox}
            placeholder={placeholder}
            className="mt-1 block w-full rounded p-2 text-sm text-zinc-800"
          />
          {selected && (
            <CheckIcon className="absolute bottom-1/2 right-2 h-6 w-6 translate-y-1/2 text-green-500" />
          )}
        </div>
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
              label.toLowerCase().includes(value.toLowerCase())
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
