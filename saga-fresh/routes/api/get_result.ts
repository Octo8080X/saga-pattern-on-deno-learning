import { FreshContext } from "$fresh/server.ts";
import { getResult } from "../../services/work.ts";

export const handler = async (
  req: Request,
  _ctx: FreshContext,
): Promise<Response> => {
  const url = new URL(req.url);
  const taskId = url.searchParams.get("taskId");

  if (!taskId) {
    return new Response(
      JSON.stringify({ error: "Task ID is required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const result = await getResult(taskId);
  return new Response(
    JSON.stringify({ result }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
};
