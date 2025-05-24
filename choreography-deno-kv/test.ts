const kv = await Deno.openKv(":memory:");
const st = kv.watch([["aaaaa"]]);

setInterval(() => {
  console.log("set");
  (async () => {
    await kv.set(["aaaaa"], crypto.randomUUID());
  })();
}, 1000);

for await (const s of st) {
  console.log(s);
}
