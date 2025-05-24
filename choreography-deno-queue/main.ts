import { delay } from "@std/async/delay";
import { Spinner } from "@std/cli/unstable-spinner";
import { getKv, GetKvType } from "./kv.ts";

class Service {
  constructor(
    getKv: GetKvType,
    task: (getKv: GetKvType) => Promise<void> | void,
    rollbackTask: (getKv: GetKvType) => Promise<void> | void,
  ) {
    task(getKv);
    rollbackTask(getKv);
  }
}

const service1 = new Service(
  getKv,
  async (getKv) => {
    const kv = await getKv();
    kv.subscribe("service1:taskStart", async ({id}) => {
      console.log("Executing task for Service 1");
      const spinner = new Spinner({ message: "Executing...", color: "yellow" });
      spinner.start();
      await delay(5000);
      spinner.stop();

      kv.publish("service1:taskCompleted", id);
    });
  },
  async (getKv) => {
    const kv = await getKv();
    kv.subscribe("service2:taskFailed", async ({id}) => {
      console.log(`Rolling back task for Service 1 ${id}`);
      const spinner = new Spinner({ message: "Rolling back...", color: "red" });
      spinner.start();
      await delay(2000);
      spinner.stop();
    });
  },
);
const service2 = new Service(
  getKv,
  async (getKv) => {
    const kv = await getKv();
    kv.subscribe("service1:taskCompleted", async ({ id }) => {
      console.log(`Executing task for Service 2 ${id}`);
      const spinner = new Spinner({ message: "Executing...", color: "yellow" });
      spinner.start();
      await delay(5000);
      spinner.stop();

      kv.publish("service2:taskFailed", id); // わざと失敗させる
    });
  },
  async (_getKv) => {
  },
);

const kv = await getKv();
kv.publish("service1:taskStart", crypto.randomUUID());
