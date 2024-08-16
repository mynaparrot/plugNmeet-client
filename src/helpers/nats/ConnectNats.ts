import type { JetStreamClient, NatsConnection } from 'nats.ws';
import { connect, tokenAuthenticator } from 'nats.ws';
import { NatsSubjects } from '../proto/plugnmeet_common_api_pb';
import {
  NatsMsgServerToClient,
  NatsMsgServerToClientEvents,
} from '../proto/plugnmeet_nats_msg_pb';
import HandleRoomMetadata from './HandleRoomMetadata';

export default class ConnectNats {
  private _nc: NatsConnection | undefined;
  private _js: JetStreamClient | undefined;
  private readonly _token: string;
  private readonly _roomId: string;
  private readonly _userId: string;
  private readonly _subjects: NatsSubjects;

  private handleRoomMetadata: HandleRoomMetadata;

  constructor(
    token: string,
    roomId: string,
    userId: string,
    subjects: NatsSubjects,
  ) {
    this._token = token;
    this._roomId = roomId;
    this._userId = userId;
    this._subjects = subjects;

    this.handleRoomMetadata = new HandleRoomMetadata();
  }

  get nc(): NatsConnection {
    return <NatsConnection>this._nc;
  }

  get js(): JetStreamClient {
    return <JetStreamClient>this._js;
  }

  public openConn = async () => {
    if (typeof this._nc === 'undefined' || this._nc.isClosed()) {
      return await this._openConn();
    }
    return true;
  };

  private _openConn = async () => {
    try {
      this._nc = await connect({
        servers: ['http://localhost:8222'],
        authenticator: tokenAuthenticator(() => this._token),
      });

      console.info(`connected ${this._nc.getServer()}`);
    } catch (e) {
      console.error(e);
      return false;
    }

    this._js = this._nc.jetstream();
    this.monitorConnStatus();
    this.subscribeToSystemPrivate();
    this.subscribeToSystemPublic();
    this.subscribeToPublicChat();

    return true;
  };

  private async monitorConnStatus() {
    if (typeof this._nc === 'undefined') {
      return;
    }
    for await (const s of this._nc.status()) {
      console.info(`${s.type}: ${s.data}`);
    }
  }

  private async subscribeToSystemPrivate() {
    if (typeof this._js === 'undefined') {
      return;
    }

    const consumerName = this._subjects.systemPrivate + ':' + this._userId;
    const consumer = await this._js.consumers.get(this._roomId, consumerName);

    const sub = await consumer.consume();
    for await (const m of sub) {
      const payload = NatsMsgServerToClient.fromBinary(m.data);
      console.log(payload.event.toString(), payload.msg);

      switch (payload.event) {
        case NatsMsgServerToClientEvents.ROOM_METADATA_UPDATE:
          await this.handleRoomMetadata.setRoomMetadata(payload.msg);
      }

      m.ack();
    }
  }

  private subscribeToSystemPublic = async () => {
    if (typeof this._js === 'undefined') {
      return;
    }

    const consumerName = this._subjects.systemPublic + ':' + this._userId;
    const consumer = await this._js.consumers.get(this._roomId, consumerName);

    const sub = await consumer.consume();
    for await (const m of sub) {
      const payload = NatsMsgServerToClient.fromBinary(m.data);
      console.log(payload.event.toString(), payload.msg);
      switch (payload.event) {
        case NatsMsgServerToClientEvents.ROOM_METADATA_UPDATE:
          await this.handleRoomMetadata.setRoomMetadata(payload.msg);
      }

      m.ack();
    }
  };

  private subscribeToPublicChat = async () => {
    if (typeof this._js === 'undefined') {
      return;
    }

    const consumerName = 'chatPublic:' + this._userId;
    const consumer = await this._js.consumers.get(this._roomId, consumerName);

    const sub = await consumer.consume();
    for await (const m of sub) {
      console.log(m.string());
      m.ack();
    }
  };
}
