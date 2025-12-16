import type { AMFlow } from "@akashic/amflow";

export interface CreateClientParameterObject {
    usePrimaryChannel: boolean;
}

export interface Session {
    open(cb: (err: Error | null) => void): void;
    on(type: "error", cb: (err: Error) => void): void;
    close(cb: (msg: string) => void): void;
    createClient(
        opts: CreateClientParameterObject,
        cb: (err: Error | null, client: AMFlow | null) => void,
    ): void;
}
