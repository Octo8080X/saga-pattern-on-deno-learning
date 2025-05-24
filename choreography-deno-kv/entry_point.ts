import { getKv } from "./kv.ts";
import { delay } from "@std/async/delay";

const kv = await getKv();

// 各サービスの起動が済んでいないとpublish先登録できないので少し待機
await delay(1000);

await kv.publish("service1:taskStart", crypto.randomUUID());

await delay(14000);
