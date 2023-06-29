import {
  BEACON_VERSION,
  BeaconErrorType,
  BeaconMessageType,
  WalletClient,
  PermissionRequestOutput,
  WalletClientOptions,
  BeaconRequestOutputMessage,
  ProofOfEventChallengeRequestOutput,
} from "beacon-wallet";
import { TinyEmitter } from "tiny-emitter";
import { buf2Hex } from "../utils/strings";

export enum Event {
  PERMISSION_REQUEST = "PERMISSION_REQUEST",
  PROOF_OF_EVENT_CHALLENGE_REQUEST = "PROOF_OF_EVENT_CHALLENGE_REQUEST",
}

class P2PClient {
  private events = new TinyEmitter();
  permissionMessage: PermissionRequestOutput | undefined = undefined;
  proofOfEvent: {
    message: undefined | ProofOfEventChallengeRequestOutput;
    data: undefined | { challenge_id: string; payload: string };
  } = {
    message: undefined,
    data: undefined,
  };

  constructor(config: WalletClientOptions) {
    // super(config);
  }

  hasReceivedPermissionRequest() {
    return !!this.permissionMessage;
  }

  hasReceivedProofOfEventRequest() {
    return !!this.proofOfEvent.message;
  }

  on(event: Event, callback: Function) {
    return this.events.on(event, callback);
  }

  async approvePermission(address: string) {
    if (!this.permissionMessage) throw new Error("Permission not received");

    return this.respond({
      type: BeaconMessageType.PermissionResponse,
      network: this.permissionMessage.network,
      scopes: this.permissionMessage.scopes,
      id: this.permissionMessage.id,
      publicKey: "",
      address,
      walletType: "abstracted_account",
      verificationType: "proof_of_event",
    });
  }

  async refusePermission() {
    if (!this.permissionMessage) throw new Error("Permission not received");

    await this.respond({
      type: BeaconMessageType.Error,
      errorType: BeaconErrorType.NOT_GRANTED_ERROR,
      version: BEACON_VERSION,
      id: this.permissionMessage.id,
      senderId: await this.beaconId,
    });
  }

  async approvePoeChallenge() {
    if (!this.proofOfEvent.message) throw new Error("Poe not received");

    return this.respond({
      ...this.proofOfEvent.message,
      type: BeaconMessageType.ProofOfEventChallengeResponse,
      isAccepted: true,
    });
  }

  async refusePoeChallenge() {
    if (!this.proofOfEvent.message) throw new Error("Poe not received");

    return this.respond({
      ...this.proofOfEvent.message,
      type: BeaconMessageType.ProofOfEventChallengeResponse,
      isAccepted: false,
    });
  }

  handleMessages = async (message: BeaconRequestOutputMessage) => {
    console.log("Message", message);
    switch (message.type) {
      case BeaconMessageType.PermissionRequest:
        this.permissionMessage = message;
        this.events.emit(Event.PERMISSION_REQUEST, message);
        break;
      case BeaconMessageType.ProofOfEventChallengeRequest:
        const encoder = new TextEncoder();

        this.proofOfEvent.message = message;
        this.proofOfEvent.data = {
          challenge_id: buf2Hex(encoder.encode(message.dAppChallengeId)),
          payload: buf2Hex(encoder.encode(message.payload)),
        };

        this.events.emit(Event.PROOF_OF_EVENT_CHALLENGE_REQUEST, message);
        break;
      case BeaconMessageType.ProofOfEventChallengeRecorded:
        console.log("NOICE");
        break;
      // case BeaconMessageType.SignPayloadRequest:
      //   if (await this.isSupportedSignPayload(message)) {
      //     this.signRequest = message;
      //     this.changeFavicon(true);
      //   }
      //   break;
      default:
        await this.respond({
          type: BeaconMessageType.Error,
          errorType: BeaconErrorType.UNKNOWN_ERROR,
          version: BEACON_VERSION,
          id: message.id,
          senderId: await this.beaconId,
        });
        console.warn("Unknown message type", message);
    }
  };
}

export default P2PClient;
