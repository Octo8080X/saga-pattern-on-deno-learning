import { GetKvType, ResultGetKV } from "./kv.ts";

export class Service {
  constructor(
    private getKv: GetKvType,
    private task: (getKv: ResultGetKV) => Promise<void> | void,
    private rollbackTask: (getKv: ResultGetKV) => Promise<void> | void,
  ) {
  }
  async start() {
    const kv = await this.getKv();
    this.task(kv);
    this.rollbackTask(kv);
  }
}
