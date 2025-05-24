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
    messageBroker.subscribe("service:taskStart", async () => {
      console.log("Executing task for Service 1");
      const spinner = new Spinner({ message: "Executing...", color: "yellow" });
      spinner.start();
      await delay(5000);
      spinner.stop();

      messageBroker.publish("service1:taskCompleted");
    });
  },
  async (messageBroker) => {
    messageBroker.subscribe("service:taskFailed", async () => {
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
    messageBroker.subscribe("service:taskStart", async () => {
      console.log("Executing task for Service 2");
      const spinner = new Spinner({ message: "Executing...", color: "yellow" });
      spinner.start();
      await delay(5000);
      spinner.stop();

      messageBroker.publish("service2:taskCompleted");
    });
  },
  async (messageBroker) => {
    messageBroker.subscribe("service:taskFailed", async () => {
      console.log("Rolling back task for Service 2");
      const spinner = new Spinner({ message: "Rolling back...", color: "red" });
      spinner.start();
      await delay(2000);
      spinner.stop();
    });
  },
);

const service3 = new Service(
  messageBroker,
  async (messageBroker) => {
    const waitingEvents = { "service1:taskCompleted": false, "service2:taskCompleted": false }; 

    const checkAllTasksCompleted = async () => {
      console.log("Executing task for Service 3");

      console.log(`  ${waitingEvents["service1:taskCompleted"] ?  "completed" : "Waiting"} for Service 1`);
      console.log(`  ${waitingEvents["service2:taskCompleted"] ?  "completed" : "Waiting"} for Service 2`);

      if (! (waitingEvents["service1:taskCompleted"] && waitingEvents["service2:taskCompleted"])) {
        console.log("  Waiting for all tasks to complete...");
        return;
      }

      const spinner = new Spinner({ message: "Executing...", color: "yellow" });
      spinner.start();
      await delay(5000);
      spinner.stop();

      console.log("Service 3 task completed");
      messageBroker.publish("service3:taskCompleted");
    };

    messageBroker.subscribe("service1:taskCompleted", () => {
        console.log("Received Service 1 task completed");
        waitingEvents["service1:taskCompleted"] = true;
        checkAllTasksCompleted();
    });

    messageBroker.subscribe("service2:taskCompleted", () => {
        console.log("Received Service 2 task completed");
        waitingEvents["service2:taskCompleted"] = true;
        checkAllTasksCompleted();
    });
  },
  async (_messageBroker) => {
  },
);


messageBroker.publish("service:taskStart");
