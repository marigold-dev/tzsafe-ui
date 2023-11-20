import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@radix-ui/react-icons";
import * as Select from "@radix-ui/react-select";
import { tzip16 } from "@taquito/tzip16";
import BigNumber from "bignumber.js";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/router";
import React, {
  forwardRef,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import fetchVersion from "../context/metadata";
import { AppDispatchContext, AppStateContext } from "../context/state";
import { version } from "../types/display";
import useIsOwner from "../utils/useIsOwner";
import { signers, toStorage } from "../versioned/apis";
import { Versioned } from "../versioned/interface";
import Copy from "./Copy";

type selectItemProps = {
  name: string | undefined;
  address: string | undefined;
  balance: string | undefined;
  threshold: string;
  version: string | undefined;
  disableCopy?: boolean;
};

const linkClass = (isActive: boolean, isDisabled: boolean = false) =>
  `${
    // There's a bug with opacity, so I set manually text color
    isDisabled
      ? "pointer-events-none text-[#707078]"
      : isActive
      ? "text-zinc-100"
      : "text-zinc-400"
  } hover:text-zinc-100 flex items-center space-x-3`;

const SelectedItem = ({
  name,
  address,
  balance,
  version,
  threshold,
  disableCopy = false,
}: selectItemProps) => {
  const formattedBalance = useMemo(() => {
    return new BigNumber(balance ?? 0).div(10 ** 6, 10).precision(5);
  }, [balance]);

  return (
    <div className="w-4/5 overflow-hidden text-left">
      <div className="flex items-center justify-between">
        <p className="text-xl text-white">{name}</p>
        <p>{threshold}</p>
      </div>
      <Copy value={address ?? ""} disabled={disableCopy}>
        <span className="mt-1 text-sm text-zinc-400" data-name="copy">
          {!address ? (
            <span>...</span>
          ) : (
            `${address.substring(0, 5)}...${address.substring(
              address.length - 5
            )}`
          )}
        </span>
      </Copy>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-lg">{formattedBalance.toString()} Tez</p>
        <p className="text-xs text-zinc-500">V{version ?? "0.0.0"}</p>
      </div>
    </div>
  );
};

const FixedTrigger = forwardRef<any, any>((props: any, ref: any) => {
  const { children, onClick, onPointerDown, disabled, ...rest } = props;

  return (
    <button
      ref={ref}
      {...rest}
      className={`radix-state-delayed-open:bg-zinc-50 radix-state-instant-open:bg-zinc-50 radix-state-on:bg-zinc-900 radix-state-open:bg-zinc-900 group inline-flex w-full select-none items-center justify-between rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-100 ${
        disabled ? "cursor-default" : "hover:bg-zinc-900"
      } focus:outline-none focus-visible:ring focus-visible:ring-red-500 focus-visible:ring-opacity-75`}
      onClick={e => {
        if ((e.target as HTMLLinkElement).dataset.name === "copy") return;

        onClick(e);
      }}
      onPointerDown={e => {
        if ((e.target as HTMLLinkElement).dataset.name === "copy") return;

        onPointerDown(e);
      }}
    >
      {children}
    </button>
  );
});
FixedTrigger.displayName = "FixedTrigger";

const Sidebar = ({
  isOpen,
  onClose,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
}) => {
  const router = useRouter();
  const path = usePathname();

  const [isClient, setIsClient] = useState(false);

  let state = useContext(AppStateContext)!;
  let dispatch = useContext(AppDispatchContext)!;

  const isOwner = useIsOwner();

  const version =
    state.contracts[state.currentContract ?? ""]?.version ??
    state.currentStorage?.version;

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!state.currentContract) return;

    (async () => {
      if (!state.currentContract) return;

      let c = await state.connection.contract.at(state.currentContract, tzip16);
      let balance = await state.connection.tz.getBalance(state.currentContract);

      let cc = await c.storage();
      let version = await (state.contracts[state.currentContract]
        ? Promise.resolve<version>(
            state.contracts[state.currentContract].version
          )
        : fetchVersion(c));

      const updatedContract = toStorage(version, cc, balance);

      state.contracts[state.currentContract]
        ? dispatch({
            type: "updateContract",
            payload: {
              address: state.currentContract,
              contract: updatedContract,
            },
          })
        : null;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentContract]);

  if (!isClient) return null;

  const currentContract = state.currentContract ?? "";

  return (
    <aside
      className={`fixed bottom-0 left-0 ${
        state.hasBanner ? "top-32" : "top-20"
      } z-10 w-72 bg-zinc-700 px-4 py-4 md:py-8 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      } overflow-y-auto md:-translate-x-0`}
    >
      <button
        className="mb-8 flex w-full items-center justify-end space-x-2 text-zinc-300 md:hidden"
        onClick={onClose}
      >
        <span className="text-xs">Close sidebar</span>
        <ArrowLeftIcon className="h-4 w-4" />
      </button>
      <Select.Root
        onValueChange={async payload => {
          // State update is done in _app
          router.push(`/${payload}/${path?.split("/")[2] ?? ""}`);
        }}
        value={currentContract}
        disabled={Object.values(state.contracts).length === 0}
      >
        <Select.Trigger asChild aria-label="Wallets">
          <FixedTrigger disabled={Object.values(state.contracts).length === 0}>
            {isLoading ? (
              <SelectedItem
                name={"-"}
                address={""}
                balance={"0"}
                threshold={"0/0"}
                version={"0.0.0"}
              />
            ) : (
              <SelectedItem
                name={state.aliases[currentContract]}
                address={currentContract}
                balance={
                  state.contracts[currentContract]?.balance ??
                  state.currentStorage?.balance
                }
                threshold={
                  !!state.contracts[currentContract]
                    ? `${state.contracts[currentContract].threshold}/${
                        signers(state.contracts[currentContract]).length
                      }`
                    : !!state.currentStorage
                    ? `${state.currentStorage.threshold}/${
                        signers(state.currentStorage).length
                      }`
                    : "0/0"
                }
                version={
                  state.contracts[currentContract]?.version ??
                  state.currentStorage?.version
                }
              />
            )}

            <Select.Icon className="ml-2">
              <ChevronDownIcon />
            </Select.Icon>
          </FixedTrigger>
        </Select.Trigger>
        <Select.Content className="z-10">
          <Select.ScrollUpButton className="flex items-center justify-center text-zinc-300">
            <ChevronUpIcon />
          </Select.ScrollUpButton>
          <Select.Viewport className="w-full rounded-lg bg-zinc-800 p-2 shadow-lg">
            <Select.Group>
              {Object.entries(state.contracts).map(
                ([address, _contract], i) => (
                  <Select.Item
                    key={`${address}-${i}`}
                    value={address}
                    className="radix-disabled:opacity-50 relative flex select-none items-center rounded-md px-8 py-2 text-sm font-medium text-zinc-300 focus:bg-zinc-800 focus:bg-zinc-900 focus:outline-none"
                  >
                    <Select.ItemText>
                      <p className="text-xl text-white">
                        {state.aliases[address]}
                      </p>

                      <p className="mt-1 text-sm text-zinc-400">
                        {address.substring(0, 5)}...
                        {address.substring(address.length - 5)}
                      </p>
                    </Select.ItemText>
                    <Select.ItemIndicator className="absolute left-2 inline-flex items-center">
                      <CheckIcon />
                    </Select.ItemIndicator>
                  </Select.Item>
                )
              )}
            </Select.Group>
          </Select.Viewport>
          <Select.ScrollDownButton className="flex items-center justify-center text-zinc-300">
            <ChevronDownIcon />
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Root>

      <div className="mt-8 flex flex-col space-y-4">
        <Link
          href={`/${state.currentContract}/proposals`}
          className={linkClass(
            path?.includes("/proposals") ?? false,
            isLoading
          )}
          onClick={onClose}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M8 12H12V10H8V12ZM8 9H16V7H8V9ZM8 6H16V4H8V6ZM6 16C5.45 16 4.97933 15.8043 4.588 15.413C4.196 15.021 4 14.55 4 14V2C4 1.45 4.196 0.979 4.588 0.587C4.97933 0.195667 5.45 0 6 0H18C18.55 0 19.021 0.195667 19.413 0.587C19.8043 0.979 20 1.45 20 2V14C20 14.55 19.8043 15.021 19.413 15.413C19.021 15.8043 18.55 16 18 16H6ZM6 14H18V2H6V14ZM2 20C1.45 20 0.979333 19.8043 0.588 19.413C0.196 19.021 0 18.55 0 18V4H2V18H16V20H2Z"
              fill="currentColor"
            />
          </svg>
          <span>Proposals</span>
        </Link>
        <Link
          href={`/${state.currentContract}/new-proposal`}
          className={linkClass(
            path?.includes("/new-proposal") ?? false,
            !isOwner || isLoading
          )}
          onClick={onClose}
        >
          <svg
            width="21"
            height="20"
            viewBox="0 0 21 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2 20C1.45 20 0.979 19.809 0.587 19.427C0.195667 19.0457 0 18.5871 0 18.0512V4.40926C0 3.87332 0.195667 3.41437 0.587 3.0324C0.979 2.65108 1.45 2.46041 2 2.46041H10.925L8.925 4.40926H2V18.0512H16V11.2789L18 9.33008V18.0512C18 18.5871 17.8043 19.0457 17.413 19.427C17.021 19.809 16.55 20 16 20H2ZM13.175 3.02071L14.6 4.3849L8 10.8161V12.2046H9.4L16.025 5.74909L17.45 7.11328L10.825 13.5688C10.6417 13.7475 10.4293 13.8897 10.188 13.9956C9.946 14.1009 9.69167 14.1535 9.425 14.1535H7C6.71667 14.1535 6.47933 14.0603 6.288 13.8738C6.096 13.6867 6 13.4551 6 13.179V10.8161C6 10.5562 6.05 10.3084 6.15 10.0726C6.25 9.83743 6.39167 9.63053 6.575 9.45189L13.175 3.02071ZM17.45 7.11328L13.175 3.02071L15.675 0.584653C16.075 0.194884 16.5543 0 17.113 0C17.671 0 18.1417 0.194884 18.525 0.584653L19.925 1.9732C20.3083 2.34673 20.5 2.80146 20.5 3.33739C20.5 3.87332 20.3083 4.32805 19.925 4.70158L17.45 7.11328Z"
              fill="currentColor"
            />
          </svg>
          <span>New proposal</span>
        </Link>
        <Link
          href={`/${state.currentContract}/fund-wallet`}
          className={linkClass(
            path?.includes("/fund-wallet") ?? false,
            !state.address || isLoading
          )}
          onClick={onClose}
        >
          <svg
            width="21"
            height="21"
            viewBox="0 0 21 21"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9.67974 0.328125C9.3024 0.365039 9.24908 0.385547 9.18756 0.529102C9.13013 0.672656 9.19166 0.849023 9.32291 0.898242C9.47877 0.959766 10.2458 0.881836 10.3401 0.795703C10.459 0.689063 10.4426 0.475781 10.3114 0.373242C10.1965 0.283008 10.176 0.283008 9.67974 0.328125Z"
              fill="currentColor"
            />
            <path
              d="M11.4434 0.360941C11.3203 0.397855 11.2383 0.508597 11.2383 0.635745C11.2383 0.840823 11.3408 0.898245 11.833 0.967972C12.3293 1.0377 12.4318 1.00899 12.4852 0.795706C12.5303 0.615237 12.4031 0.479886 12.1324 0.426566C11.8371 0.369144 11.5213 0.336331 11.4434 0.360941Z"
              fill="currentColor"
            />
            <path
              d="M7.69043 0.684961C7.28027 0.795703 7.13672 0.898242 7.13672 1.07461C7.13672 1.21406 7.26387 1.35352 7.39512 1.35352C7.54687 1.35352 8.21543 1.14844 8.29746 1.07871C8.4082 0.976172 8.3877 0.758789 8.26055 0.660352C8.1293 0.557813 8.1457 0.553711 7.69043 0.684961Z"
              fill="currentColor"
            />
            <path
              d="M13.3342 0.885935C13.1415 1.12793 13.2522 1.25918 13.8018 1.45605L14.2366 1.61191L14.3473 1.52988C14.4868 1.42734 14.5196 1.19765 14.4088 1.09922C14.3104 1.00898 13.6829 0.779295 13.5352 0.779295C13.4573 0.779295 13.3876 0.816209 13.3342 0.885935Z"
              fill="currentColor"
            />
            <path
              d="M5.68066 1.49707C5.31973 1.69805 5.25 1.76777 5.25 1.93184C5.25 2.05488 5.41406 2.21484 5.53301 2.21484C5.56992 2.21484 5.775 2.11641 5.98828 1.99746C6.43945 1.74727 6.51328 1.64062 6.36973 1.44375C6.23848 1.26738 6.07031 1.27969 5.68066 1.49707Z"
              fill="currentColor"
            />
            <path
              d="M15.3112 1.64883C15.2004 1.70215 15.1348 1.87852 15.1799 1.99746C15.225 2.12461 15.8854 2.54297 16.0372 2.54297C16.2586 2.54297 16.3858 2.32559 16.2832 2.13281C16.234 2.04258 15.6352 1.65293 15.4998 1.62422C15.4465 1.61191 15.3604 1.62422 15.3112 1.64883Z"
              fill="currentColor"
            />
            <path
              d="M9.37207 1.82519C6.0457 2.25996 3.24023 4.58144 2.19844 7.75605C1.89082 8.69531 1.76367 9.48691 1.76367 10.5C1.76367 11.5131 1.89082 12.3047 2.19844 13.2439C2.6291 14.5523 3.32227 15.6721 4.32305 16.677C5.07363 17.4234 5.75039 17.9074 6.66504 18.3586C9.07676 19.5357 11.9479 19.5357 14.335 18.3586C18.3012 16.398 20.1838 11.8904 18.7811 7.69043C17.7229 4.51172 14.8148 2.17383 11.4762 1.80879C10.9512 1.75137 9.88477 1.75957 9.37207 1.82519ZM9.02754 4.31484L9.26953 4.45019V5.56582V6.68555H11.8658H14.4621L14.7246 6.95215L14.9912 7.21875L13.3916 8.81836C11.8371 10.3729 11.8002 10.4139 11.993 10.3564C12.2514 10.2785 12.6328 10.2785 12.9404 10.3564C13.7197 10.5574 14.3924 11.1029 14.741 11.8125C15.2701 12.8953 15.266 14.1545 14.7287 15.2578C14.5564 15.6146 14.052 16.1602 13.7279 16.3365C12.8215 16.8328 11.6074 16.9559 10.6723 16.6482C9.90938 16.3939 9.33926 15.6803 9.28184 14.9051C9.25723 14.5729 9.30645 14.376 9.46641 14.1832C9.77813 13.81 10.4836 13.8141 10.7994 14.1873C10.9799 14.4047 11.0373 14.741 10.9471 15.065C10.902 15.2373 10.701 15.4875 10.5779 15.5244C10.4549 15.5654 10.4836 15.6475 10.6641 15.7705C10.9799 15.9879 11.7182 16.1232 12.1611 16.0412C13.0184 15.8812 13.5311 15.2783 13.6992 14.2201C13.7648 13.8182 13.732 12.8174 13.6418 12.4893C13.4039 11.6197 12.8543 11.0865 12.0996 10.9963C11.7346 10.9512 11.5008 11.0127 10.9225 11.2957L10.377 11.5623V11.4023C10.377 11.2506 10.4877 11.0906 11.7592 9.38027C12.518 8.36308 13.1537 7.50176 13.1783 7.47305C13.207 7.43613 12.8174 7.42383 11.2424 7.42383H9.26543L9.27773 9.63047L9.29004 11.8371L9.41309 12.0832C9.57305 12.3949 9.79453 12.5303 10.1391 12.5262C10.5328 12.5221 10.8855 12.3006 11.3039 11.7961C11.4516 11.6197 11.4844 11.5992 11.5828 11.6238C11.7346 11.6607 11.8207 11.8658 11.7715 12.0709C11.6895 12.4359 11.2875 12.9035 10.8855 13.1004C10.5451 13.2686 10.2088 13.3137 9.68379 13.2562C8.71582 13.1537 8.27285 12.8748 7.98984 12.1816C7.89551 11.9561 7.89551 11.9355 7.8832 9.68789L7.8709 7.42383H6.87012H5.86523V7.05469V6.68555H6.87012H7.875V5.85293V5.02031L7.64941 4.79883C7.44023 4.58965 7.42383 4.56504 7.42383 4.38047V4.18359H8.10469H8.78145L9.02754 4.31484Z"
              fill="currentColor"
            />
            <path
              d="M3.97855 2.64551C3.54379 3.01465 3.48636 3.12949 3.64222 3.32637C3.77758 3.49043 3.92933 3.44941 4.28207 3.1582C4.70453 2.80957 4.76605 2.67422 4.59379 2.50195C4.44613 2.3543 4.27797 2.39531 3.97855 2.64551Z"
              fill="currentColor"
            />
            <path
              d="M16.9354 2.90391C16.8739 2.95723 16.8452 3.02695 16.8452 3.11309C16.8452 3.21973 16.8944 3.29766 17.1241 3.52734C17.4481 3.85547 17.5917 3.9293 17.7435 3.86367C17.8542 3.81035 17.9403 3.63809 17.9034 3.52734C17.8911 3.49043 17.7353 3.31816 17.5589 3.1459C17.2103 2.80547 17.1077 2.76855 16.9354 2.90391Z"
              fill="currentColor"
            />
            <path
              d="M2.48141 4.1918C2.16559 4.58965 2.13278 4.68398 2.24352 4.83164C2.33375 4.95059 2.41578 4.9834 2.55934 4.94648C2.66188 4.92187 3.14176 4.32715 3.17867 4.17539C3.21559 4.02363 3.06383 3.85547 2.88746 3.85547C2.76031 3.85547 2.7234 3.88828 2.48141 4.1918Z"
              fill="currentColor"
            />
            <path
              d="M18.3873 4.39687C18.2765 4.45019 18.1986 4.63477 18.2396 4.74141C18.3175 4.93008 18.7154 5.46328 18.8097 5.49609C18.9902 5.56582 19.1953 5.42227 19.1953 5.22539C19.1953 5.14746 18.822 4.55684 18.7113 4.4584C18.6088 4.37227 18.4898 4.34766 18.3873 4.39687Z"
              fill="currentColor"
            />
            <path
              d="M1.50117 5.71348C1.36992 5.88164 1.14844 6.37793 1.14844 6.49688C1.14844 6.60762 1.3084 6.76758 1.41914 6.76758C1.5668 6.76758 1.67754 6.64453 1.8457 6.2877C2.02617 5.90215 2.04668 5.75039 1.93594 5.64785C1.80879 5.52891 1.62012 5.55762 1.50117 5.71348Z"
              fill="currentColor"
            />
            <path
              d="M19.3677 6.23437C19.2447 6.35332 19.2529 6.48867 19.421 6.89062C19.6261 7.37871 19.7615 7.47715 19.9911 7.29668C20.1347 7.18594 20.1265 7.0875 19.9501 6.64453C19.7574 6.16054 19.581 6.0375 19.3677 6.23437Z"
              fill="currentColor"
            />
            <path
              d="M0.750735 7.60019C0.70972 7.65352 0.63179 7.875 0.57847 8.09648C0.492337 8.46562 0.488235 8.49844 0.549759 8.59277C0.635892 8.72402 0.804056 8.76504 0.939407 8.69121C1.02554 8.64199 1.06245 8.56406 1.13628 8.28516C1.25523 7.83398 1.26343 7.69043 1.16909 7.58789C1.06245 7.47305 0.849173 7.47715 0.750735 7.60019Z"
              fill="currentColor"
            />
            <path
              d="M20.0444 8.16621C19.9049 8.24824 19.8926 8.37949 19.9747 8.82656C20.0362 9.14238 20.0772 9.26543 20.1428 9.31875C20.3438 9.48691 20.5899 9.34746 20.5899 9.07265C20.5899 8.87578 20.5202 8.46562 20.4586 8.31387C20.3889 8.1334 20.2084 8.07187 20.0444 8.16621Z"
              fill="currentColor"
            />
            <path
              d="M0.434803 9.60586C0.328163 9.69609 0.324061 9.7248 0.299452 10.1514C0.278944 10.5738 0.283045 10.6066 0.365077 10.6928C0.475819 10.8076 0.697303 10.8199 0.787538 10.7133C0.832655 10.6641 0.861366 10.5082 0.881874 10.1883C0.906483 9.78633 0.89828 9.7289 0.832655 9.64687C0.717811 9.51152 0.566053 9.49101 0.434803 9.60586Z"
              fill="currentColor"
            />
            <path
              d="M20.2494 10.2621C20.155 10.3482 20.1427 10.3934 20.1181 10.8158C20.0894 11.2711 20.0935 11.2793 20.1961 11.3818C20.3109 11.4967 20.4463 11.5131 20.5652 11.4229C20.717 11.308 20.7744 10.459 20.6431 10.3031C20.5283 10.1678 20.3724 10.1514 20.2494 10.2621Z"
              fill="currentColor"
            />
            <path
              d="M0.488024 11.6812C0.385485 11.7674 0.377282 11.8904 0.45111 12.317C0.512633 12.6656 0.561852 12.7764 0.684899 12.8338C0.82025 12.8953 0.996617 12.8297 1.05814 12.6943C1.11966 12.5631 0.984313 11.8002 0.881774 11.6895C0.787438 11.5869 0.611071 11.5828 0.488024 11.6812Z"
              fill="currentColor"
            />
            <path
              d="M20.0155 12.3457C19.9704 12.3908 19.9253 12.477 19.9089 12.5385C19.8966 12.6041 19.8474 12.7846 19.8064 12.9445C19.7407 13.1783 19.7366 13.2604 19.7736 13.3424C19.8761 13.5721 20.2083 13.568 20.2986 13.3383C20.4093 13.0512 20.5077 12.5549 20.4708 12.4523C20.397 12.2596 20.1591 12.2021 20.0155 12.3457Z"
              fill="currentColor"
            />
            <path
              d="M0.984375 13.6992C0.939258 13.7443 0.902344 13.8264 0.902344 13.8838C0.902344 14.0027 1.17305 14.7041 1.24277 14.7615C1.42324 14.9092 1.72266 14.7861 1.72266 14.5646C1.72266 14.4375 1.46016 13.7936 1.36582 13.6869C1.27969 13.5926 1.08691 13.5967 0.984375 13.6992Z"
              fill="currentColor"
            />
            <path
              d="M19.4127 14.2939C19.3101 14.3678 18.982 15.024 18.982 15.1635C18.9779 15.3521 19.1789 15.4793 19.3675 15.4137C19.4537 15.385 19.5193 15.2865 19.667 14.9912C19.7695 14.782 19.8515 14.5729 19.8515 14.5236C19.8515 14.4129 19.6793 14.2324 19.5767 14.2324C19.5357 14.2324 19.4619 14.2611 19.4127 14.2939Z"
              fill="currentColor"
            />
            <path
              d="M1.90723 15.5654C1.8498 15.6187 1.80469 15.7049 1.80469 15.7582C1.80469 15.8484 2.1 16.3324 2.26816 16.517C2.3707 16.6318 2.58398 16.6441 2.67422 16.5375C2.81367 16.3816 2.80137 16.3078 2.54707 15.9223C2.22715 15.4383 2.1 15.3686 1.90723 15.5654Z"
              fill="currentColor"
            />
            <path
              d="M18.3627 16.0863C18.2191 16.1971 17.8008 16.7918 17.8008 16.882C17.8008 17.0256 17.9402 17.1445 18.1043 17.1445C18.252 17.1445 18.3709 17.0297 18.6949 16.5744C18.8508 16.357 18.859 16.2709 18.7236 16.1396C18.617 16.0289 18.4693 16.0084 18.3627 16.0863Z"
              fill="currentColor"
            />
            <path
              d="M3.1623 17.2102C3.11309 17.2717 3.07617 17.3578 3.07617 17.3988C3.07617 17.5014 3.6709 18.1207 3.79805 18.1535C3.89238 18.1781 4.05645 18.1125 4.10977 18.0305C4.12617 18.0059 4.14258 17.9279 4.14258 17.8582C4.14258 17.7557 4.08516 17.6777 3.81855 17.4193C3.44941 17.0584 3.31406 17.0174 3.1623 17.2102Z"
              fill="currentColor"
            />
            <path
              d="M16.6646 17.8869C16.3652 18.1412 16.3242 18.1904 16.3242 18.3094C16.3242 18.4734 16.4432 18.5924 16.6072 18.5924C16.6893 18.5924 16.8164 18.5186 17.0379 18.334C17.4604 17.9853 17.5219 17.85 17.3496 17.6777C17.1938 17.5219 17.0338 17.567 16.6646 17.8869Z"
              fill="currentColor"
            />
            <path
              d="M4.85219 18.457C4.73734 18.5021 4.66761 18.6375 4.68402 18.777C4.69222 18.8631 4.77015 18.9369 5.06136 19.1297C5.45101 19.3922 5.59867 19.4291 5.74222 19.2979C5.80375 19.2404 5.82426 19.1789 5.81605 19.0764C5.80375 18.941 5.77504 18.9082 5.45511 18.699C5.05726 18.4406 4.97933 18.4078 4.85219 18.457Z"
              fill="currentColor"
            />
            <path
              d="M15.0323 18.9902C14.8314 19.101 14.6427 19.224 14.614 19.2609C14.4827 19.4414 14.6222 19.6875 14.8478 19.6875C14.9954 19.6875 15.6517 19.343 15.7091 19.2363C15.7337 19.1953 15.7501 19.1215 15.7501 19.0723C15.7501 18.9656 15.5737 18.7852 15.4753 18.7852C15.4343 18.7893 15.2374 18.8795 15.0323 18.9902Z"
              fill="currentColor"
            />
            <path
              d="M6.67327 19.4291C6.56663 19.4578 6.4723 19.6629 6.51742 19.7777C6.57074 19.9172 6.62816 19.9541 7.0096 20.0936C7.39105 20.2371 7.48949 20.2453 7.62074 20.1551C7.72327 20.0854 7.74788 19.8105 7.66175 19.7367C7.59613 19.6834 6.84554 19.4004 6.78812 19.4045C6.76761 19.4086 6.71429 19.4168 6.67327 19.4291Z"
              fill="currentColor"
            />
            <path
              d="M13.125 19.7572C12.7189 19.8762 12.6328 19.9377 12.6328 20.1141C12.6328 20.2658 12.6615 20.315 12.7887 20.3807C12.8666 20.4217 12.9527 20.4094 13.2809 20.3232C13.8264 20.1756 13.9781 20.0074 13.7771 19.7531C13.6746 19.6219 13.5803 19.6219 13.125 19.7572Z"
              fill="currentColor"
            />
            <path
              d="M8.59283 20.0771C8.36724 20.2986 8.5108 20.516 8.92916 20.5857C9.42545 20.6678 9.59771 20.6637 9.68384 20.5529C9.78228 20.434 9.78228 20.2986 9.69205 20.1838C9.63463 20.1141 9.53209 20.0813 9.21216 20.0361C8.69127 19.9582 8.70767 19.9582 8.59283 20.0771Z"
              fill="currentColor"
            />
            <path
              d="M11.1071 20.0977C10.9061 20.1141 10.7215 20.151 10.6805 20.1838C10.5165 20.3191 10.5452 20.5898 10.738 20.6678C10.9061 20.7375 11.6239 20.6637 11.7305 20.5693C11.8536 20.4586 11.8413 20.2494 11.7059 20.1428C11.6444 20.0936 11.5665 20.0607 11.5296 20.0607C11.4926 20.0648 11.304 20.0812 11.1071 20.0977Z"
              fill="currentColor"
            />
          </svg>
          <span>Fund wallet</span>
        </Link>
        <Link
          href={`/${state.currentContract}/settings`}
          className={linkClass(path?.includes("/settings") ?? false, isLoading)}
          onClick={onClose}
        >
          <svg
            width="21"
            height="20"
            viewBox="0 0 21 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M7.3 20L6.9 16.8C6.68333 16.7167 6.47933 16.6167 6.288 16.5C6.096 16.3833 5.90833 16.2583 5.725 16.125L2.75 17.375L0 12.625L2.575 10.675C2.55833 10.5583 2.55 10.4457 2.55 10.337V9.662C2.55 9.554 2.55833 9.44167 2.575 9.325L0 7.375L2.75 2.625L5.725 3.875C5.90833 3.74167 6.1 3.61667 6.3 3.5C6.5 3.38333 6.7 3.28333 6.9 3.2L7.3 0H12.8L13.2 3.2C13.4167 3.28333 13.621 3.38333 13.813 3.5C14.0043 3.61667 14.1917 3.74167 14.375 3.875L17.35 2.625L20.1 7.375L17.525 9.325C17.5417 9.44167 17.55 9.554 17.55 9.662V10.337C17.55 10.4457 17.5333 10.5583 17.5 10.675L20.075 12.625L17.325 17.375L14.375 16.125C14.1917 16.2583 14 16.3833 13.8 16.5C13.6 16.6167 13.4 16.7167 13.2 16.8L12.8 20H7.3ZM10.1 13.5C11.0667 13.5 11.8917 13.1583 12.575 12.475C13.2583 11.7917 13.6 10.9667 13.6 10C13.6 9.03333 13.2583 8.20833 12.575 7.525C11.8917 6.84167 11.0667 6.5 10.1 6.5C9.11667 6.5 8.28733 6.84167 7.612 7.525C6.93733 8.20833 6.6 9.03333 6.6 10C6.6 10.9667 6.93733 11.7917 7.612 12.475C8.28733 13.1583 9.11667 13.5 10.1 13.5Z"
              fill="currentColor"
            />
          </svg>
          <span>Settings</span>
        </Link>
        <Link
          href={`/${state.currentContract}/history`}
          className={linkClass(path?.includes("/history") ?? false, isLoading)}
          onClick={onClose}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10 8.6L12.5 11.1C12.6833 11.2833 12.775 11.5167 12.775 11.8C12.775 12.0833 12.6833 12.3167 12.5 12.5C12.3167 12.6833 12.0833 12.775 11.8 12.775C11.5167 12.775 11.2833 12.6833 11.1 12.5L8.3 9.7C8.2 9.6 8.125 9.48733 8.075 9.362C8.025 9.23733 8 9.10833 8 8.975V5C8 4.71667 8.096 4.479 8.288 4.287C8.47933 4.09567 8.71667 4 9 4C9.28333 4 9.521 4.09567 9.713 4.287C9.90433 4.479 10 4.71667 10 5V8.6ZM9 18C6.98333 18 5.175 17.404 3.575 16.212C1.975 15.0207 0.9 13.4667 0.35 11.55C0.266667 11.25 0.296 10.9667 0.438 10.7C0.579333 10.4333 0.8 10.2667 1.1 10.2C1.38333 10.1333 1.63767 10.1957 1.863 10.387C2.08767 10.579 2.24167 10.8167 2.325 11.1C2.75833 12.5667 3.596 13.75 4.838 14.65C6.07933 15.55 7.46667 16 9 16C10.95 16 12.604 15.3207 13.962 13.962C15.3207 12.604 16 10.95 16 9C16 7.05 15.3207 5.39567 13.962 4.037C12.604 2.679 10.95 2 9 2C7.85 2 6.775 2.26667 5.775 2.8C4.775 3.33333 3.93333 4.06667 3.25 5H5C5.28333 5 5.521 5.09567 5.713 5.287C5.90433 5.479 6 5.71667 6 6C6 6.28333 5.90433 6.52067 5.713 6.712C5.521 6.904 5.28333 7 5 7H1C0.716667 7 0.479333 6.904 0.288 6.712C0.0960001 6.52067 0 6.28333 0 6V2C0 1.71667 0.0960001 1.479 0.288 1.287C0.479333 1.09567 0.716667 1 1 1C1.28333 1 1.521 1.09567 1.713 1.287C1.90433 1.479 2 1.71667 2 2V3.35C2.85 2.28333 3.88767 1.45833 5.113 0.875C6.33767 0.291667 7.63333 0 9 0C10.25 0 11.421 0.237333 12.513 0.712C13.6043 1.18733 14.5543 1.829 15.363 2.637C16.171 3.44567 16.8127 4.39567 17.288 5.487C17.7627 6.579 18 7.75 18 9C18 10.25 17.7627 11.4207 17.288 12.512C16.8127 13.604 16.171 14.554 15.363 15.362C14.5543 16.1707 13.6043 16.8127 12.513 17.288C11.421 17.7627 10.25 18 9 18Z"
              fill="currentColor"
            />
          </svg>
          <span>History</span>
        </Link>

        <Link
          href={`/${state.currentContract}/beacon`}
          className={linkClass(
            path?.includes("/beacon") ?? false,
            isLoading || !isOwner || !Versioned.hasTzip27Support(version)
          )}
          onClick={onClose}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
          <span>Connect to Dapp</span>
        </Link>

        <a
          href="https://docs.tzsafe.marigold.dev"
          target="_blank"
          rel="noreferrer"
          className={linkClass(false, isLoading)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="scale-150"
          >
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span>Help</span>
        </a>
      </div>
    </aside>
  );
};

export default Sidebar;
