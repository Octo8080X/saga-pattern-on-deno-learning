import { delay } from "@std/async/delay";
import { Spinner } from "@std/cli/unstable-spinner";
import { getKv } from "./kv.ts";
import { Service } from "./service.ts";

const service2 = new Service(
  getKv,
  async ({ subscribe, publish }) => {
    subscribe("service1:taskCompleted", async (msg) => {
      console.log(`Executing task for Service 2 ${msg.id}`);
      const spinner = new Spinner({
        message: "Executing...",
        color: "yellow",
      });
      spinner.start();
      await delay(5000);
      spinner.stop();

      publish("service2:taskfailed", msg.id); // わざと失敗させる

      console.log(`Service 2 task failed ${msg.id}`);
    });
  },
  async (_getKv) => {
  },
);

service2.start();

console.log("Service 2 started");
