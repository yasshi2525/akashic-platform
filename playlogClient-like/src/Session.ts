export interface Session {
    open(cb: (err: Error | null) => void): void;
    on(type: "error", cb: (err: Error) => void): void;
    close(cb: (msg: string) => void): void;
}
