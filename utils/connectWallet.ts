import { Dispatch } from "react";
import { PREFERED_NETWORK, RPC_URL } from "../context/config";
import { action, tezosState } from "../context/state";

export const connectWallet = async (
  state: tezosState,
  dispatch: Dispatch<action>
): Promise<void> => {
  await state?.beaconWallet!.requestPermissions({
    network: {
      type: PREFERED_NETWORK,
      rpcUrl: RPC_URL,
    },
  });

  const userAddress: string = await state?.beaconWallet!.getPKH()!;
  const balance = await state?.connection.tz.getBalance(userAddress);
  let s = await state?.beaconWallet!.client.getActiveAccount();
  dispatch!({
    type: "login",
    accountInfo: s!,
    address: userAddress,
    balance: balance!.toString(),
  });
};
