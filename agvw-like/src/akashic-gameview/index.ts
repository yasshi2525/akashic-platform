export const ScaleMode = {
    None: 0,
    Fill: 1,
    AspectFit: 2,
} as const;

export const VerticalAlignment = {
    Top: 0,
    Center: 1,
    Bottom: 2,
} as const;

export const HorizontalAlignment = {
    Left: 0,
    Center: 1,
    Right: 2,
} as const;

export const ExecutionMode = {
    Active: 0,
    Passive: 1,
    Replay: 2,
} as const;

export const ProtocolType = {
    WebSocket: 0,
} as const;

export const EventDropPolicy = {
    InReplay: 0,
    Always: 1,
    Never: 2,
} as const;

export const DroppedEventReason = {
    Unknown: 0,
    Replay: 1,
} as const;

export const DroppedEventType = {
    Click: 0,
    Down: 1,
    Move: 2,
    Up: 3,
} as const;
