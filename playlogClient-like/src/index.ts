import { ProtocolType } from "./akashic-gameview";
import { SessionLike, SessionOptions } from "./SessionLike";

export * from "./AMFlowClient";
export * from "./SessionLike";

export const Socket = { Type: { ...ProtocolType } };
export const Session = (url: string, opts: SessionOptions) =>
    new SessionLike(url, opts);
