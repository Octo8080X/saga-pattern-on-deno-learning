import { Service } from "./service.ts";

import { getMessageBroker } from "./messageBroker.ts";
import { work3 } from "./work.ts";

const service3 = new Service(
  getMessageBroker,
  work3,
  () => {},
);

service3.start();

console.log("Service 1 started");
