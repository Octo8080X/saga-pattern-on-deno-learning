import { Service } from "./service.ts";

import { getMessageBroker } from "./messageBroker.ts";
import { work1, work1Rollback } from "./work.ts";

const service1 = new Service(
  getMessageBroker,
  work1,
  work1Rollback,
);

service1.start();

console.log("Service 1 started");
