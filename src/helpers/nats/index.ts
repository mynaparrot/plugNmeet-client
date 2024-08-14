import {
  connect,
  type JetStreamClient,
  type NatsConnection,
  tokenAuthenticator,
} from 'nats.ws';

let nc: NatsConnection, js: JetStreamClient;

export const createNatsConn = async (
  token: string,
  roomId: string,
  userId: string,
) => {
  try {
    nc = await connect({
      servers: ['http://localhost:8222'],
      authenticator: tokenAuthenticator(token),
    });

    (async () => {
      console.info(`connected ${nc.getServer()}`);
      for await (const s of nc.status()) {
        console.info(`${s.type}: ${s.data}`);
      }
    })().then();
  } catch (e) {
    console.error(e);
    return;
  }

  js = nc.jetstream();

  subscribeToSystemPrivate(roomId, userId);
  subscribeToSystemPublic(roomId, userId);
  subscribeToPublicChat(roomId, userId);

  const subject = 'systemWorker.' + roomId + '.' + userId;
  for (let i = 0; i < 10; i++) {
    js.publish(subject, 'test');
  }
};

const subscribeToSystemPrivate = async (roomId: string, userId: string) => {
  const consumerName = 'sysPrivate:' + userId;
  const consumer = await js.consumers.get(roomId, consumerName);

  const sub = await consumer.consume();
  for await (const m of sub) {
    console.log(m.string());
    m.ack();
  }
};

const subscribeToSystemPublic = async (roomId: string, userId: string) => {
  const consumerName = 'sysPublic:' + userId;
  const consumer = await js.consumers.get(roomId, consumerName);

  const sub = await consumer.consume();
  for await (const m of sub) {
    console.log(m.string());
    m.ack();
  }
};

const subscribeToPublicChat = async (roomId: string, userId: string) => {
  const consumerName = 'chatPublic:' + userId;
  const consumer = await js.consumers.get(roomId, consumerName);

  const sub = await consumer.consume();
  for await (const m of sub) {
    console.log(m.string());
    m.ack();
  }
};
