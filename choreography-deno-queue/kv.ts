export type ResultGetKV = Promise<{
  publish: (msg: string, id: string) => Promise<void>;
  subscribe: (msg: string, callback: (msg: { id: string }) => void) => void;
}>;
export type GetKvType = () => ResultGetKV;

const kv = await Deno.openKv("./tmp/choreography-deno-queue");
const callbacks = {} as { [key: string]: {key: string, callbacks: ((msg: { id: string }) => void)[]}};

export async function getKv(): ResultGetKV {

  const publish = async (key: string, id: string) => {
    console.log(`publishing message key: ${key}, id: ${id}`);
    await kv.enqueue({ key, id });
  };

  const subscribe = (key: string, callback: (msg: { id: string }) => void) => {
    console.log(`subscribing to message: ${key}`);

    if (!callbacks[key]) {
      callbacks[key] = {key, callbacks: []};
    }
    callbacks[key].callbacks.push(callback);

    kv.listenQueue((msg) => {
      console.log(`message received: ${JSON.stringify(msg)}`);
      callbacks[msg.key].callbacks.forEach(cb => {
        cb(msg);
      });
    });
  };

  return {
    publish,
    subscribe,
  };
}
