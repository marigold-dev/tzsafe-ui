import { Wallet } from "@taquito/taquito";
import fromIpfs from "../context/fromIpfs";
import { CONTRACTS } from "../context/version";
import { version } from "../types/display";

export default async function deployTzSafe(
  wallet: Wallet,
  owners: string[],
  threshold: number,
  effective_period: number,
  version: version
) {
  const deploying_files = CONTRACTS[version];
  if (!deploying_files)
    throw Error(
      `The contract version, ${version}, doesn't support for deployment.`
    );

  const [deploying_contract, metadata] = deploying_files;
  const metablob = await fromIpfs(metadata);
  const deploy = await wallet
    .originate({
      code: deploying_contract,
      storage: {
        proposal_counter: 0,
        proposals: [],
        owners,
        archives: [],
        threshold,
        effective_period,
        ...metablob,
      },
    })
    .send();
  const result = await deploy.contract();
  return result;
}
