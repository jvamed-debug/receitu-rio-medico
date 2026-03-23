import { Injectable } from "@nestjs/common";
import { AsyncLocalStorage } from "node:async_hooks";

type RequestContextStore = {
  requestId: string;
  correlationId: string;
  method: string;
  path: string;
};

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContextStore>();

  run<T>(store: RequestContextStore, callback: () => T) {
    return this.storage.run(store, callback);
  }

  getStore() {
    return this.storage.getStore();
  }

  getRequestId() {
    return this.storage.getStore()?.requestId;
  }

  getCorrelationId() {
    return this.storage.getStore()?.correlationId;
  }
}
