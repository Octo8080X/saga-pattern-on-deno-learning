import { ResultMessageBroker } from "./messageBroker.ts";

export class Service {
  constructor(
    private getMessageBroker: () => Promise<ResultMessageBroker>,
    private task: (
      { publish, subscribe }: ResultMessageBroker,
    ) => Promise<void> | void,
    private rollbackTask: (
      { publish, subscribe }: ResultMessageBroker,
    ) => Promise<void> | void,
  ) {
  }
  async start() {
    const kv = await this.getMessageBroker();
    this.task(kv);
    this.rollbackTask(kv);
  }
}
