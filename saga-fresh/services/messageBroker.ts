/// <reference lib="deno.unstable" />

import { delay } from "@std/async/delay";

const MESSAGE_BROKER_PREFIX = "choreography" as const;
const MESSAGE_BROKER_UPDATE_KEY = "update" as const;
const MESSAGE_BROKER_MESSAGES_KEY = "messages" as const;
const MESSAGE_BROKER_SUBSCRIBERS_KEY = "subscribers" as const;

function getUpdateKey(key: string, clientId: string): string[] {
  return [MESSAGE_BROKER_PREFIX, key, MESSAGE_BROKER_UPDATE_KEY, clientId];
}
function getMessagesKey(key: string, clientId: string): string[] {
  return [
    MESSAGE_BROKER_PREFIX,
    key,
    MESSAGE_BROKER_MESSAGES_KEY,
    clientId,
  ];
}

function getMessageKey(key: string, clientId: string, id: string): string[] {
  return [
    MESSAGE_BROKER_PREFIX,
    key,
    MESSAGE_BROKER_MESSAGES_KEY,
    clientId,
    id,
  ];
}
function getSubscribersKey(key: string): string[] {
  return [MESSAGE_BROKER_PREFIX, key, MESSAGE_BROKER_SUBSCRIBERS_KEY];
}

function getSubscriberKey(key: string, clientId: string): string[] {
  return [MESSAGE_BROKER_PREFIX, key, MESSAGE_BROKER_SUBSCRIBERS_KEY, clientId];
}

export type ResultMessageBroker = {
  publish: (
    key: string,
    taskId: string,
    payload: { [key: string]: unknown },
  ) => Promise<void>;
  subscribe: (
    key: string,
    callback: (
      taskId: string,
      payload: { [key: string]: unknown },
    ) => Promise<void> | void,
  ) => void;
};

type KV_MESSAGE_BLOCKER_RAW_TYPE = {
  taskId: string;
  payload: { [key: string]: unknown };
};

export async function getMessageBroker(): Promise<ResultMessageBroker> {
  const kv = await Deno.openKv("./tmp/choreography");
  const clientId = crypto.randomUUID();

  const publish = async (
    key: string,
    taskId: string,
    payload: { [key: string]: unknown },
  ) => {
    console.log(
      `publishing message key: ${key}, taskId: ${taskId}, payload: ${
        JSON.stringify(payload)
      }`,
    );
    const subscribers = await kv.list<string>({
      prefix: getSubscribersKey(key),
    });

    for await (const subscriber of subscribers) {
      const atomic = kv.atomic();
      atomic.set(getUpdateKey(key, subscriber.value), (new Date()).getTime());
      atomic.set(getMessageKey(key, subscriber.value, taskId), {
        taskId,
        payload,
      });
      await atomic.commit();
    }
  };

  const subscribe = (
    key: string,
    callback: (
      taskId: string,
      payload: { [key: string]: unknown },
    ) => Promise<void> | void,
  ) => {
    (async () => {
      console.info(`subscribing to message: ${key}`);
      let lastUpdate = 0;

      const atomic = kv.atomic();
      atomic.set(
        getSubscriberKey(key, clientId),
        clientId,
      );
      atomic.set(
        getUpdateKey(key, clientId),
        0,
      );
      await atomic.commit();

      while (true) {
        await delay(1000);
        const update = await kv.get<number>(
          getUpdateKey(key, clientId),
        );

        if (update.value === null || update.value <= lastUpdate) {
          continue;
        }
        lastUpdate = update.value;

        const messages = kv.list<KV_MESSAGE_BLOCKER_RAW_TYPE>({
          prefix: getMessagesKey(key, clientId),
        });

        for await (const message of messages) {
          await callback(message.value.taskId, message.value.payload);
          await kv.delete(message.key);
        }
      }
    })();
  };
  return {
    publish,
    subscribe,
  };
}
