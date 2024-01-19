import {
  BeaconErrorType,
  BeaconMessageType,
  PermissionRequestOutput,
  BeaconRequestOutputMessage,
  ProofOfEventChallengeRequestOutput,
  ConnectionContext,
  WalletClient,
  WalletClientOptions,
  SigningType,
  BeaconResponseInputMessage,
} from "@airgap/beacon-sdk";
import { PreapplyParams } from "@taquito/rpc";
import { TinyEmitter } from "tiny-emitter";

export enum Event {
  PERMISSION_REQUEST = "PERMISSION_REQUEST",
  PROOF_OF_EVENT_CHALLENGE_REQUEST = "PROOF_OF_EVENT_CHALLENGE_REQUEST",
  SIMULATED_PROOF_OF_EVENT_CHALLENGE_REQUEST = "SIMULATED_PROOF_OF_EVENT_CHALLENGE_REQUEST",
  INCOMING_OPERATION = "INCOMING_OPERATION",
  SIGN_PAYLOAD = "SIGN_PAYLOAD",
}

class P2PClient extends WalletClient {
  private events = new TinyEmitter();

  permissionMessage: PermissionRequestOutput | undefined = undefined;
  proofOfEvent: {
    message: undefined | ProofOfEventChallengeRequestOutput;
    data: undefined | { payload: string };
  } = {
    message: undefined,
    data: undefined,
  };

  constructor(config: WalletClientOptions) {
    super(config);
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
      id: this.permissionMessage.id,
      senderId: await this.beaconId,
    });
  }

  async dismissPoeChallenge() {
    if (!this.proofOfEvent.message) throw new Error("Poe not received");

    const payload = {
      ...this.proofOfEvent.message,
      type: BeaconMessageType.ProofOfEventChallengeResponse,
      isAccepted: false,
    };
    this.proofOfEvent = { message: undefined, data: undefined };

    return this.respond(payload as BeaconResponseInputMessage);
  }

  async approvePoeChallenge() {
    if (!this.proofOfEvent.message) throw new Error("Poe not received");

    const payload = {
      ...this.proofOfEvent.message,
      type: BeaconMessageType.ProofOfEventChallengeResponse,
      isAccepted: true,
    };

    this.proofOfEvent = { message: undefined, data: undefined };

    return this.respond(payload as BeaconResponseInputMessage);
  }

  async refusePoeChallenge() {
    if (!this.proofOfEvent.message) throw new Error("Poe not received");

    return this.respond({
      ...this.proofOfEvent.message,
      type: BeaconMessageType.ProofOfEventChallengeResponse,
      isAccepted: false,
    });
  }

  handleMessages = async (
    message: BeaconRequestOutputMessage,
    _context: ConnectionContext
  ) => {
    switch (message.type) {
      case BeaconMessageType.PermissionRequest:
        this.permissionMessage = message;
        this.events.emit(Event.PERMISSION_REQUEST, message);
        break;
      case BeaconMessageType.ProofOfEventChallengeRequest:
        this.proofOfEvent.message = message;
        this.proofOfEvent.data = {
          payload: message.payload,
        };
        this.events.emit(Event.PROOF_OF_EVENT_CHALLENGE_REQUEST, message);
        break;
      case BeaconMessageType.ProofOfEventChallengeRecorded:
        break;
      case BeaconMessageType.SignPayloadRequest:
        this.events.emit(Event.SIGN_PAYLOAD, message);
        break;
      case BeaconMessageType.OperationRequest:
        this.events.emit(Event.INCOMING_OPERATION, message);
        break;

      case BeaconMessageType.BroadcastRequest:
        window.alert("Broadcast requests are not supported");

      case BeaconMessageType.SimulatedProofOfEventChallengeRequest:
        this.events.emit(
          Event.SIMULATED_PROOF_OF_EVENT_CHALLENGE_REQUEST,
          message
        );
      default:
        await this.respond({
          type: BeaconMessageType.Error,
          errorType: BeaconErrorType.UNKNOWN_ERROR,
          id: message.id,
          senderId: await this.beaconId,
        });
        console.warn("Unknown message type", message);
    }
  };

  async abortRequest(id: string, reason: string) {
    return this.respond({
      type: BeaconMessageType.Error,
      errorType: BeaconErrorType.ABORTED_ERROR,
      id,
      senderId: await this.beaconId,
      errorData: reason,
    });
  }

  async sendError(id: string, reason: string, errorType: BeaconErrorType) {
    return this.respond({
      type: BeaconMessageType.Error,
      errorType,
      id,
      senderId: await this.beaconId,
      errorData: reason,
    });
  }

  async transactionResponse(id: string, transactionHash: string) {
    return this.respond({
      type: BeaconMessageType.OperationResponse,
      id,
      senderId: await this.beaconId,
      transactionHash,
    });
  }

  async signResponse(id: string, signingType: SigningType, signature: string) {
    return this.respond({
      type: BeaconMessageType.SignPayloadResponse,
      id,
      senderId: await this.beaconId,
      signingType,
      signature,
    });
  }

  async spoeResponse(id: string, ops: PreapplyParams, errorMessage?: string) {
    return this.respond({
      type: BeaconMessageType.SimulatedProofOfEventChallengeResponse,
      id,
      senderId: await this.beaconId,
      operationsList: Buffer.from(JSON.stringify(ops)).toString("base64"),
      errorMessage: errorMessage ?? "",
    });
  }

  async disconnectAll() {
    const peers = await this.getPeers();
    return Promise.all(peers.map(peer => this.sendDisconnectToPeer(peer)));
  }
}

export default P2PClient;
