import { delay } from "@std/async/delay";
import { getMessageBroker } from "./messageBroker.ts";
import { getResult, getStatus } from "./work.ts";

export async function startTask(task2Param: number, task3Param: number) {
  const { publish } = await getMessageBroker();
  const taskId = crypto.randomUUID();
  publish("work1:start", taskId, {
    task2: {
      param: task2Param,
    },
    task3: {
      param: task3Param,
    },
  });
  return taskId;
}

export { getResult, getStatus } from "./work.ts";

if (import.meta.main) {
  await delay(500);
  const taskId = await startTask(4, 4);

  await delay(6000);
  console.log("Task result: ", await getResult(taskId));
  await delay(6000);
  console.log("Task result: ", await getResult(taskId));
  await delay(6000);
  console.log("Task result: ", await getResult(taskId));
  console.log("Task status: ", await getStatus(taskId));

  await delay(6000);
  console.log("Task result: ", await getResult(taskId));
  await delay(6000);
  console.log("Task result: ", await getResult(taskId));
  await delay(6000);
  console.log("Task result: ", await getResult(taskId));
  console.log("Task status: ", await getStatus(taskId));
}
