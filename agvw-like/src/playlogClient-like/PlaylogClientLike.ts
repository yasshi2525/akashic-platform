import { ProtocolType } from "../akashic-gameview";
import { PlaylogClient } from "./PlaylogClient";
import { Session } from "./Session";
import { SessionLike } from "./SessionLike";
import { SessionOptions } from "./parameters";

export class PlaylogClientLike implements PlaylogClient {
    Socket = { Type: { ...ProtocolType } };
    Session(url: string, opts: SessionOptions): Session {
        return new SessionLike(url, opts);
    }
}
