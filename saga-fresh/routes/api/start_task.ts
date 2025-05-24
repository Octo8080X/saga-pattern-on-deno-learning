import { FreshContext } from "$fresh/server.ts";
import { startTask } from "../../services/mod.ts";

export const handler = async (
  req: Request,
  _ctx: FreshContext,
): Promise<Response> => {
  const json = await req.json();

  if (
    !json || typeof json.task2 !== "number" || typeof json.task3 !== "number"
  ) {
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }

  const taskId = await startTask(json.task2, json.task3);
  return new Response(
    JSON.stringify({
      message: "Task started successfully",
      taskId: taskId,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
};
