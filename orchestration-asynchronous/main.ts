import { delay  } from "@std/async/delay";
import { Spinner } from "@std/cli/unstable-spinner";

class Service {
  constructor(
    private name: string,
    private task: () => Promise<boolean> | boolean,
    private rollbackTask: () => Promise<void> | void,
  ) {}

  async execute() {
    console.log(`Call task for Service: ${this.name}...`);
    const tmp = await Promise.try(this.task);
    console.log(`Finished task for Service: ${this.name}`);
    return tmp;
  }

  async rollback() {
    console.log(`Rolling back task for Service: ${this.name}`);
    await this.rollbackTask();
  }
}

class Orchestrator {
  private executedServices: Service[] = [];
  constructor(private services: Service[]) {}

  async execute() {
    console.log("Executing orchestrator...");
    let doRollback = false;
    for (const service of this.services) {
      const result = await service.execute();
      if (!result) {
        doRollback = true;
        break;
      }
      this.executedServices.push(service);
    }

    if (doRollback) {
      return this.rollback();
    }
  }
  async rollback() {
    console.log("Rollback all services");
    for (const service of this.executedServices.reverse()) {
      await service.rollback();
    }
  }
}

const orchestrator = new Orchestrator(
  [
    new Service(
      "Service 1",
      async () => {
        console.log("Executing task for Service 1");
        const spinner = new Spinner({ message: "Executing...", color: "yellow" });
        spinner.start();
        await delay(5000);
        spinner.stop();
        return true;
      },
      async () => {
        console.log("Rolling back task for Service 1");
        const spinner = new Spinner({ message: "Rolling back ...", color: "yellow" });
        spinner.start();
        await delay(5000);
        spinner.stop();

      },
    ),
    new Service(
      "Service 2",
      async () => {
        console.log("Executing task for Service 2");
        const spinner = new Spinner({ message: "Executing...", color: "yellow" });
        spinner.start();
        await delay(5000);
        spinner.stop();
        return false; // わざと失敗させる
      },
      () => {
        console.log("Rollback task for Service 2");
      },
    ),
  ],
);

orchestrator.execute();
