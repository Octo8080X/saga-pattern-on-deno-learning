import { ResultMessageBroker } from "./messageBroker.ts";
import { delay } from "@std/async/delay";

const appKv = await Deno.openKv("./tmp/app");

const LOG_KV_PREFIX = "log";
const logsKvKey = (taskId: string) => [LOG_KV_PREFIX, taskId];

const logKvKey = (
  taskId: string,
) => [LOG_KV_PREFIX, taskId, new Date().toISOString()];

const RESULT_KV_PREFIX = "result";
const resultKvKey = (key: string) => [RESULT_KV_PREFIX, key];

const COMPLETE_KV_PREFIX = "complete";
const completeKvKey = (key: string) => [COMPLETE_KV_PREFIX, key];

const STATUS_KV_PREFIX = "status";
const tasksStatusKvKey = (
  key: string,
) => [STATUS_KV_PREFIX, key];

const statusKvKey = (
  key: string,
  taskName: string,
) => [STATUS_KV_PREFIX, key, taskName];

// work1は、appKv に 0 を設定する
export function work1(
  { publish, subscribe }: ResultMessageBroker,
): void {
  subscribe("work1:start", async (taskId, payload) => {
    console.log("Work 1 event received:", taskId, payload);

    await delay(2000);

    const atomic = appKv.atomic();
    atomic.set(resultKvKey(taskId), 0);
    atomic.set(completeKvKey(taskId), false);
    atomic.set(statusKvKey(taskId, "work1"), "started");
    atomic.set(
      logKvKey(taskId),
      `Work 1 started. Task ID: ${taskId}, Payload: ${JSON.stringify(payload)}`,
    );
    await atomic.commit();

    const atomic2 = appKv.atomic();
    atomic2.set(statusKvKey(taskId, "work1"), "completed");
    atomic2.set(
      logKvKey(taskId),
      `Work 1 completed. Task ID: ${taskId}, Payload: ${
        JSON.stringify(payload)
      }`,
    );
    await atomic2.commit();

    publish("work2:start", taskId, payload);
  });
}

// work1Rollbackは、appKv のキーを削除する
export function work1Rollback(
  { publish, subscribe }: ResultMessageBroker,
) {
  subscribe("work1:rollback", async (taskId, payload) => {
    console.log("Work 1 rollback event received:", taskId, payload);

    await delay(2000);

    const atomic = appKv.atomic();
    atomic.set(statusKvKey(taskId, "work1"), "rollback");
    atomic.set(
      logKvKey(taskId),
      `Work 1 rollback started. Task ID: ${taskId}, Payload: ${
        JSON.stringify(payload)
      }`,
    );
    atomic.delete(resultKvKey(taskId));
    atomic.set(completeKvKey(taskId), true);
    await atomic.commit();

    publish("work1:rollback:complete", taskId, payload);
  });
}

// 型ガード関数 isValidWork2Payload を追加
function isValidWork2Payload(
  payload: unknown,
): payload is { task2: { param: number } } {
  if (
    typeof payload !== "object" || payload === null || !("task2" in payload)
  ) return false;
  const task2 = (payload as { task2?: unknown }).task2;
  if (
    typeof task2 !== "object" || task2 === null || !("param" in task2)
  ) return false;
  const param = (task2 as { param?: unknown }).param;
  return typeof param === "number";
}

// work2は、appKv のキー resultKvKey(taskId) に payload.task2.param を足す
export function work2(
  { publish, subscribe }: ResultMessageBroker,
): void {
  subscribe("work2:start", async (taskId, payload) => {
    console.log("Work 2 event received:", taskId, payload);

    await delay(2000);

    const atomic1 = appKv.atomic();
    atomic1.set(statusKvKey(taskId, "work2"), "started");
    atomic1.set(
      logKvKey(taskId),
      `Work 2 started. Task ID: ${taskId}, Payload: ${JSON.stringify(payload)}`,
    );
    await atomic1.commit();

    if (!isValidWork2Payload(payload)) {
      const atomic2 = appKv.atomic();
      atomic2.set(statusKvKey(taskId, "work2"), "rollback");
      atomic2.set(
        logKvKey(taskId),
        `Work 2 rollback due to invalid payload. Task ID: ${taskId}, Payload: ${
          JSON.stringify(payload)
        }`,
      );
      await atomic2.commit();

      publish("work1:rollback", taskId, payload);
      return;
    }

    const { value: currentValue, versionstamp } = await appKv.get<number>(
      resultKvKey(taskId),
    );
    if (currentValue === undefined) {
      const atomic2 = appKv.atomic();
      atomic2.set(statusKvKey(taskId, "work2"), "rollback");
      atomic2.set(
        logKvKey(taskId),
        `Work 2 rollback due to missing result. Task ID: ${taskId}, Payload: ${
          JSON.stringify(payload)
        }`,
      );
      await atomic2.commit();

      publish("work1:rollback", taskId, payload);
    }

    const newValue = currentValue! + payload.task2.param;

    const atomic3 = appKv.atomic();
    atomic3.set(resultKvKey(taskId), newValue);
    atomic3.set(statusKvKey(taskId, "work2"), "completed");
    atomic3.check({ key: resultKvKey(taskId), versionstamp });
    atomic3.set(
      logKvKey(taskId),
      `Work 2 completed. Task ID: ${taskId}, Payload: ${
        JSON.stringify(payload)
      }`,
    );
    const res = await atomic3.commit();

    if (!res.ok) {
      const atomic4 = appKv.atomic();
      atomic4.set(statusKvKey(taskId, "work2"), "rollback");
      atomic4.set(
        logKvKey(taskId),
        `Work 2 rollback due to versionstamp mismatch. Task ID: ${taskId}, Payload: ${
          JSON.stringify(payload)
        }`,
      );
      await atomic4.commit();

      publish("work1:rollback", taskId, payload);
      return;
    }

    publish("work3:start", taskId, payload);
  });
}

// work2Rollbackは、appKv のキー resultKvKey(taskId) に payload.task2.param を引く
export function work2Rollback(
  { publish, subscribe }: ResultMessageBroker,
) {
  subscribe("work2:rollback", async (taskId, payload) => {
    console.log("Work 2 rollback event received:", taskId, payload);

    await delay(2000);

    const atomic1 = appKv.atomic();
    atomic1.set(statusKvKey(taskId, "work2"), "rollback");
    atomic1.set(
      logKvKey(taskId),
      `Work 2 rollback started. Task ID: ${taskId}, Payload: ${
        JSON.stringify(payload)
      }`,
    );
    await atomic1.commit();

    if (!isValidWork2Payload(payload)) {
      const atomic2 = appKv.atomic();
      atomic2.set(statusKvKey(taskId, "work2"), "rollback");
      atomic2.set(
        logKvKey(taskId),
        `Work 2 rollback due to invalid payload. Task ID: ${taskId}, Payload: ${
          JSON.stringify(payload)
        }`,
      );
      await atomic2.commit();

      publish("work2:rollback:error", taskId, payload);
      return;
    }

    const { value: currentValue, versionstamp } = await appKv.get<number>(
      resultKvKey(taskId),
    );
    if (currentValue === undefined) {
      const atomic2 = appKv.atomic();
      atomic2.set(statusKvKey(taskId, "work2"), "rollback");
      atomic2.set(
        logKvKey(taskId),
        `Work 2 rollback started. Task ID: ${taskId}, Payload: ${
          JSON.stringify(payload)
        }`,
      );
      await atomic2.commit();

      publish("work2:rollback:error", taskId, payload);
      return;
    }

    console.log(`currentValue: ${currentValue}`);
    console.log(`payload.task2.param: ${payload.task2.param}`);
    const newValue = currentValue! - payload.task2.param;

    const atomic3 = appKv.atomic();
    atomic3.set(resultKvKey(taskId), newValue);
    atomic3.set(statusKvKey(taskId, "work2"), "rollback");
    atomic3.check({ key: resultKvKey(taskId), versionstamp });
    atomic3.set(
      logKvKey(taskId),
      `Work 2 rollback completed. Task ID: ${taskId}, Payload: ${
        JSON.stringify(payload)
      }`,
    );
    const res = await atomic3.commit();

    if (!res.ok) {
      const atomic4 = appKv.atomic();
      atomic4.set(statusKvKey(taskId, "work2"), "rollback");
      atomic4.set(
        logKvKey(taskId),
        `Work 2 rollback error. Task ID: ${taskId}, Payload: ${
          JSON.stringify(payload)
        }`,
      );
      await atomic4.commit();

      publish("work2:rollback:error", taskId, payload);
      return;
    }

    publish("work1:rollback", taskId, payload);
  });
}

// 型ガード関数 isValidWork2Payload を追加
function isValidWork3Payload(
  payload: unknown,
): payload is { task3: { param: number } } {
  if (
    typeof payload !== "object" || payload === null || !("task3" in payload)
  ) return false;
  const task3 = (payload as { task3?: unknown }).task3;
  if (
    typeof task3 !== "object" || task3 === null || !("param" in task3)
  ) return false;
  const param = (task3 as { param?: unknown }).param;
  return typeof param === "number";
}

// work3は、appKv のキー resultKvKey(taskId) に payload.task3.param を掛ける
export function work3(
  { publish, subscribe }: ResultMessageBroker,
): void {
  subscribe("work3:start", async (taskId, payload) => {
    console.log("Work 3 event received:", taskId, payload);

    await delay(2000);

    const atomic1 = appKv.atomic();
    atomic1.set(statusKvKey(taskId, "work3"), "started");
    atomic1.set(
      logKvKey(taskId),
      `Work 3 started. Task ID: ${taskId}, Payload: ${JSON.stringify(payload)}`,
    );
    await atomic1.commit();

    if (!isValidWork3Payload(payload)) {
      const atomic2 = appKv.atomic();
      atomic2.set(statusKvKey(taskId, "work3"), "rollback");
      atomic2.set(
        logKvKey(taskId),
        `Work 3 rollback due to invalid payload. Task ID: ${taskId}, Payload: ${
          JSON.stringify(payload)
        }`,
      );
      await atomic2.commit();

      publish("work2:rollback", taskId, payload);
      return;
    }

    // たまに失敗させる
    if (Math.random() < 0.4) {
      const atomic2 = appKv.atomic();
      atomic2.set(statusKvKey(taskId, "work3"), "rollback");
      atomic2.set(
        logKvKey(taskId),
        `Work 3 rollback due to random failure. Task ID: ${taskId}, Payload: ${
          JSON.stringify(payload)
        }`,
      );
      await atomic2.commit();

      publish("work2:rollback", taskId, payload);
      return;
    }

    const { value: currentValue, versionstamp } = await appKv.get<number>(
      resultKvKey(taskId),
    );
    if (currentValue === undefined) {
      const atomic3 = appKv.atomic();
      atomic3.set(statusKvKey(taskId, "work3"), "rollback");
      atomic3.set(
        logKvKey(taskId),
        `Work 3 rollback due to missing result. Task ID: ${taskId}, Payload: ${
          JSON.stringify(payload)
        }`,
      );
      await atomic3.commit();

      publish("work2:rollback", taskId, payload);
    }

    console.log(`currentValue: ${currentValue}`);
    const newValue = currentValue! * payload.task3.param;

    const atomic4 = appKv.atomic();
    atomic4.set(resultKvKey(taskId), newValue);
    atomic4.set(completeKvKey(taskId), true);
    atomic4.set(statusKvKey(taskId, "work3"), "completed");
    atomic4.check({ key: resultKvKey(taskId), versionstamp });
    atomic4.set(
      logKvKey(taskId),
      `Work 3 completed. Task ID: ${taskId}, Payload: ${
        JSON.stringify(payload)
      }`,
    );
    const res = await atomic4.commit();

    if (!res.ok) {
      const atomic5 = appKv.atomic();
      atomic5.set(statusKvKey(taskId, "work3"), "rollback");
      atomic5.set(
        logKvKey(taskId),
        `Work 3 rollback due to versionstamp mismatch. Task ID: ${taskId}, Payload: ${
          JSON.stringify(payload)
        }`,
      );
      await atomic5.commit();
      publish("work2:rollback", taskId, payload);
      return;
    }
  });
}

export async function getStatus(taskId: string) {
  const entries = appKv.list<string>({ prefix: tasksStatusKvKey(taskId) });

  const tmp = [];
  for await (const entry of entries) {
    tmp.push({
      taskName: entry.key[2],
      status: entry.value,
    });
  }
  return tmp;
}
export async function getResult(taskId: string) {
  const result = await appKv.get<number>(resultKvKey(taskId));
  if (result.value === undefined) {
    return "not found";
  }
  return result.value;
}

export async function getLog(taskId: string) {
  const entries = appKv.list<string>({ prefix: logsKvKey(taskId) });

  const tmp = [];
  for await (const entry of entries) {
    tmp.push({
      time: entry.key[2],
      message: entry.value,
    });
  }
  return tmp;
}

export async function getComplete(taskId: string) {
  const complete = await appKv.get<boolean>(completeKvKey(taskId));
  if (complete.value === undefined) {
    return false;
  }
  return complete.value;
}
