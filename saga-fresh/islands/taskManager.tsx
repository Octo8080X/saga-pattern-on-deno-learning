import { Button } from "../components/Button.tsx";
import { useEffect, useState } from "preact/hooks";

export default function TaskManager() {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskParams, setTaskParams] = useState<
    { task2: number; task3: number }
  >({
    task2: 3,
    task3: 4,
  });
  const [isDoingTask, setIsDoingTask] = useState(false);
  const [taskStatus, setTaskStatus] = useState<
    { taskName: string; status: string }[]
  >([]);
  const [taskResult, setTaskResult] = useState<number | null>(null);
  const [taskLogs, setTaskLogs] = useState<{ time: string; message: string }[]>(
    [],
  );

  useEffect(() => {
    if (!taskId || !isDoingTask) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/get_status?taskId=${taskId}`);
        if (res.ok) {
          const data = await res.json();
          setTaskStatus(data.status);
          setIsDoingTask(!data.complete);
          if (data.complete) {
            clearInterval(timer);
          }
        }
        const resResult = await fetch(`/api/get_result?taskId=${taskId}`);
        if (resResult.ok) {
          const data = await resResult.json();
          setTaskResult(data.result);
        }
        const resLogs = await fetch(`/api/get_logs?taskId=${taskId}`);
        if (resLogs.ok) {
          const data = await resLogs.json();
          setTaskLogs(data.logs);
        }
      } catch (_e) {
        // 通信エラー時は何もしない
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [taskId, isDoingTask]);

  const startTask = async () => {
    if (isDoingTask) return;

    setIsDoingTask(true);

    try {
      const res = await fetch("/api/start_task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskParams),
      });
      if (!res.ok) {
        const error = await res.json();
        console.error("Error starting task:", error);
        setIsDoingTask(false);
        return;
      }
      const data = await res.json();
      if (data.taskId) {
        setTaskId(data.taskId);
        setTaskResult(null);
        setTaskStatus([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleParamChange = (e: Event, key: "task2" | "task3") => {
    const value = Number((e.currentTarget as HTMLInputElement).value);
    setTaskParams((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div>
      <div class="flex row gap-8 py-6">
        <input
          type="number"
          class="border border-gray-400 p-1 rounded"
          placeholder="Task 2 Parameter"
          value={taskParams.task2}
          min={0}
          onInput={(e) => handleParamChange(e, "task2")}
        />
        X
        <input
          type="number"
          class="border border-gray-400 p-1 rounded"
          placeholder="Task 3 Parameter"
          value={taskParams.task3}
          min={0}
          onInput={(e) => handleParamChange(e, "task3")}
        />
        <span class="font-bold text-lg">
          ={taskResult !== null ? taskResult : "?"}
        </span>
      </div>
      <div class="py-6">
        <Button onClick={startTask} disabled={isDoingTask}>Start</Button>
      </div>
      <div class="py-6">
        <h2 class="font-bold text-lg">Task ID: {taskId}</h2>
      </div>
      <div class="py-6">
        <div>
          <h3 class="font-bold text-lg">Task Status:</h3>
        </div>
        <table class="border-collapse border border-gray-400 w-[800px] text-center">
          <thead>
            <tr>
              <th class="text-center">Task Name</th>
              <th class="text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {taskId && taskStatus.length > 0
              ? (
                taskStatus.map((status) => (
                  <tr key={status.taskName}>
                    <td class="items-center text-center">
                      <p class="mx-2 text-center">{status.taskName}</p>
                    </td>
                    <td class="items-center text-center">
                      <p class="mx-2 text-center">
                        <pre class="text-center">{status.status}</pre>
                      </p>
                    </td>
                  </tr>
                ))
              )
              : (
                <tr>
                  <td colSpan={2} class="text-center">
                    <p class="mx-2 text-center">No task started yet.</p>
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>
      <div class="py-6 flex flex-col">
        <div>
          <h3 class="font-bold text-lg">Logs:</h3>
        </div>
        <div>
          <table class="border-collapse border border-gray-400 w-[800px]">
            <thead>
              <tr>
                <th>Time</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {taskId && taskLogs.length > 0
                ? (
                  taskLogs.map((log) => (
                    <tr key={log.time}>
                      <td>
                        <p class="mx-1 text-xs">{log.time}</p>
                      </td>
                      <td>
                        <p class="mx-1 text-xs">{log.message}</p>
                      </td>
                    </tr>
                  ))
                )
                : (
                  <tr>
                    <td colSpan={2} class="text-center">
                      <p class="mx-2 text-center">No logs yet.</p>
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
