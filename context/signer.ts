import { SigningType } from "@airgap/beacon-sdk";
import { BeaconWallet } from "@taquito/beacon-wallet";
import { Signer } from "@taquito/taquito";
import { buf2hex, hex2buf } from "@taquito/utils";

// The purpose of this Signer is to create the SPoE signature
// So it only works with signing operations
export class BeaconSigner implements Signer {
  constructor(private wallet: BeaconWallet) {}

  async sign(
    op: string,
    magicByte?: Uint8Array | undefined
  ): Promise<{
    bytes: string;
    sig: string;
    prefixSig: string;
    sbytes: string;
  }> {
    const bytes = hex2buf(op);
    const tmpBuffer = new Uint8Array(
      bytes.byteLength + (magicByte?.byteLength ?? 0)
    );

    tmpBuffer.set(magicByte ?? [], 0);
    tmpBuffer.set(bytes, magicByte?.byteLength ?? 0);

    const payload = buf2hex(tmpBuffer);
    console.log("SALUT:", op, magicByte, payload);
    const { signature } = await this.wallet.client.requestSignPayload({
      signingType: SigningType.OPERATION,
      payload,
    });

    return {
      bytes: payload,
      sig: "",
      prefixSig: signature,
      sbytes: payload,
    };
  }
  publicKey(): Promise<string> {
    return this.wallet.getPK();
  }
  publicKeyHash(): Promise<string> {
    return this.wallet.getPKH();
  }
  secretKey(): Promise<string | undefined> {
    throw new Error("Can't implement");
  }
}
