class Service {
  constructor(
    private name: string,
    private task: () => boolean,
    private rollbackTask: () => void,
  ) {}

  execute() {
    console.log(`Call task for Service: ${this.name}...`);
    const tmp = this.task();
    console.log(`Finished task for Service: ${this.name}`);
    return tmp;
  }

  rollback() {
    console.log(`Rolling back task for Service: ${this.name}`);
    this.rollbackTask();
  }
}

class Orchestrator {
  private executedServices: Service[] = [];
  constructor(private services: Service[]) {}

  execute() {
    console.log("Executing orchestrator...");
    let doRollback = false;
    for (const service of this.services) {
      const result = service.execute();
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
  rollback() {
    console.log("Rollback all services");
    for (const service of this.executedServices.reverse()) {
      service.rollback();
    }
  }
}

const orchestrator = new Orchestrator(
  [
    new Service(
      "Service 1",
      () => {
        console.log("Executing task for Service 1");
        return true;
      },
      () => {
        console.log("Rolling back task for Service 1");
      },
    ),
    new Service(
      "Service 2",
      () => {
        console.log("Executing task for Service 2");
        return false; // わざと失敗させる
      },
      () => {
        console.log("Rollback task for Service 2");
      },
    ),
  ],
);

orchestrator.execute();
