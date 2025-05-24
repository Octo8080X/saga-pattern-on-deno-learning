import { delay } from "@std/async/delay";
import { Spinner } from "@std/cli/unstable-spinner";

class MessageBroker {
  private subscribers: { [key: string]: (() => Promise<void> | void)[] } = {};

  subscribe(event: string, callback: () => Promise<void> | void) {
    if (!this.subscribers[event]) {
      this.subscribers[event] = [];
    }
    this.subscribers[event].push(callback);
  }

  publish(event: string) {
    if (this.subscribers[event]) {
      this.subscribers[event].forEach((callback) => callback());
    }
  }
}

class Service {
  constructor(
    private messageBroker: MessageBroker,
    private task: (messageBroker: MessageBroker) => Promise<void> | void,
    private rollbackTask: (
      messageBroker: MessageBroker,
    ) => Promise<void> | void,
  ) {
    task(messageBroker);
    rollbackTask(messageBroker);
  }
}

const messageBroker = new MessageBroker();
const service1 = new Service(
  messageBroker,
  async (messageBroker) => {
    messageBroker.subscribe("service1:taskStart", async () => {
      console.log("Executing task for Service 1");
      const spinner = new Spinner({ message: "Executing...", color: "yellow" });
      spinner.start();
      await delay(5000);
      spinner.stop();

      messageBroker.publish("service1:taskCompleted");
    });
  },
  async (messageBroker) => {
    messageBroker.subscribe("service2:taskfailed", async () => {
      console.log("Rolling back task for Service 1");
      const spinner = new Spinner({ message: "Rolling back...", color: "red" });
      spinner.start();
      await delay(2000);
      spinner.stop();
    });
  },
);
const service2 = new Service(
  messageBroker,
  async (messageBroker) => {
    messageBroker.subscribe("service1:taskCompleted", async () => {
      console.log("Executing task for Service 2");
      const spinner = new Spinner({ message: "Executing...", color: "yellow" });
      spinner.start();
      await delay(5000);
      spinner.stop();

      messageBroker.publish("service2:taskfailed"); // わざと失敗させる
    });
  },
  async (messageBroker) => {
    messageBroker.subscribe("service2:taskCompleted", async () => {
      console.log("Rolling back task for Service 2");
      const spinner = new Spinner({ message: "Rolling back...", color: "red" });
      spinner.start();
      await delay(2000);
      spinner.stop();
    });
  },
);

messageBroker.publish("service1:taskStart");
