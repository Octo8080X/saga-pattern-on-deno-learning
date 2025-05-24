import { useSignal } from "@preact/signals";
import TaskManager from "../islands/taskManager.tsx";

export default function Home() {
  const count = useSignal(3);
  return (
    <div class="w-full min-w-[800px] flex flex-grow px-4 py-8 bg-gray-100">
      <div class="mx-auto flex flex-col items-center justify-center w-full">
        <h1 class="text-4xl font-bold">Saga Pattern Sample</h1>
        <TaskManager />
      </div>
    </div>
  );
}
