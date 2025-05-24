import { GetKvType } from "./kv.ts";

export class Service {
  constructor(
    getKv: GetKvType,
    task: (getKv: GetKvType) => Promise<void> | void,
    rollbackTask: (getKv: GetKvType) => Promise<void> | void,
  ) {
    task(getKv);
    rollbackTask(getKv);
  }
}
