import { ProtocolType } from "./akashic-gameview";
import { SessionOptions } from "./parameters";
import { Session } from "./Session";

export interface PlaylogClient {
    Socket: { Type: typeof ProtocolType };
    Session(url: string, param: SessionOptions): Session;
}
