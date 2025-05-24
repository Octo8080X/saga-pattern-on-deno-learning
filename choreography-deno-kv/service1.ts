import { delay } from "@std/async/delay";
import { Spinner } from "@std/cli/unstable-spinner";
import { getKv } from "./kv.ts";
import { Service } from "./service.ts";

const service1 = new Service(
  getKv,
  async ({ subscribe, publish }) => {
    subscribe("service1:taskStart", async (msg: { id: string }) => {
      console.log(`Executing task for Service 1 ${msg.id}`);
      const spinner = new Spinner({
        message: "Executing...",
        color: "yellow",
      });
      spinner.start();
      await delay(5000);
      spinner.stop();

      publish("service1:taskCompleted", msg.id);
    });
  },
  async ({ subscribe }) => {
    subscribe("service2:taskfailed", async (msg: { id: string }) => {
      console.log(`Rolling back task for Service 1 ${msg.id}`);
      const spinner = new Spinner({
        message: "Rolling back...",
        color: "red",
      });
      spinner.start();
      await delay(2000);
      spinner.stop();
    });
  },
);

service1.start();

console.log("Service 1 started");
