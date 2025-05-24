import { Service } from "./service.ts";

import { getMessageBroker } from "./messageBroker.ts";
import { work2, work2Rollback } from "./work.ts";

const service2 = new Service(
  getMessageBroker,
  work2,
  work2Rollback,
);

service2.start();

console.log("Service 2 started");
