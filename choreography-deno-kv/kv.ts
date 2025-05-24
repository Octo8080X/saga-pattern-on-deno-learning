import { delay } from "@std/async/delay";
export type ResultGetKV = {
  publish: (key: string, id: string) => Promise<void>;
  subscribe: (
    key: string,
    callback: (msg: { id: string }) => Promise<void> | void,
  ) => void;
  row: Deno.Kv;
};
export type GetKvType = () => Promise<ResultGetKV>;

const kv = await Deno.openKv("choreography-deno-kv");

export function getKv(): Promise<ResultGetKV> {
  const clientId = crypto.randomUUID();

  const publish = async (key: string, id: string) => {
    console.log(`publishing message key: ${key}, id: ${id}`);
    const subscribers = await kv.list<string>({
      prefix: ["choreography-deno-kv", key, "subscribers"],
    });

    for await (const subscriber of subscribers) {
      const atomic = kv.atomic();
      atomic.set([
        "choreography-deno-kv",
        key,
        "update",
        subscriber.value,
      ], (new Date()).getTime());
      atomic.set([
        "choreography-deno-kv",
        key,
        "messages",
        subscriber.value,
        id,
      ], id);
      await atomic.commit();
    }
  };

  const subscribe = (
    key: string,
    callback: (msg: { id: string }) => Promise<void> | void,
  ) => {
    (async () => {
      console.log(`subscribing to message: ${key}`);
      let lastUpdate = 0;

      const atomic = kv.atomic();
      atomic.set(
        ["choreography-deno-kv", key, "subscribers", clientId],
        clientId,
      );
      atomic.set(
        ["choreography-deno-kv", key, "update", clientId],
        (new Date()).getTime(),
      );
      await atomic.commit();

      while (true) {
        await delay(10);
        const update = await kv.get<number>([
          "choreography-deno-kv",
          key,
          "update",
          clientId,
        ]);

        if (!update.value || update.value <= lastUpdate) {
          continue;
        }
        lastUpdate = update.value;

        const messages = kv.list<string>({
          prefix: [
            "choreography-deno-kv",
            key,
            "messages",
            clientId,
          ],
        });

        for await (const message of messages) {
          await callback({ id: message.value });
          await kv.delete(message.key);
        }
      }
    })();
  };

  return {
    publish,
    subscribe,
    row: kv,
  };
}
