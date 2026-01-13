import type { Permission } from "@akashic/amflow";
import { InvalidStatusError } from "@yasshi2525/amflow-server-event-schema";

const keys = ["amf:token", "amf:event", "amf:startpoint"] as const;
type KeyType = (typeof keys)[number];

const keyNames = ["Token", "Event", "StartPoint"] as const;
type KeyNameType = (typeof keyNames)[number];

export const RedisKey = {
    Token: "amf:token",
    Event: "amf:event",
    StartPoint: "amf:startpoint",
} as const satisfies Record<KeyNameType, KeyType>;

export const genKey = (type: string, ...params: (string | number)[]) =>
    `${type}:${params
        .map((v) => {
            if (typeof v === "number") {
                return v.toString();
            } else {
                return v;
            }
        })
        .join(":")}`;

const zsetKeys = [
    "amf:events:unfiltered",
    "amf:events:filtered",
    "amf:startpoints",
    "amf:startpoints:frame",
    "amf:startpoints:timestamp",
] as const;
type ZSetKeyType = (typeof zsetKeys)[number];

const zsetKeyNames = [
    "UnfilteredEvent",
    "FilteredEvent",
    "StartPointByFrame",
    "StartPointByTimestamp",
] as const;
type ZSetKeyNameType = (typeof zsetKeyNames)[number];

/**
 * NOTE:
 * * UnfilteredEvent: 非transient で 非 ignorable なもの。 transient なものは無視するが、現状存在しない
 * * FilteredEvent: 非transient なもの。 transient と ignorable なものは無視する（PointEventが該当）
 */
export const RedisZSetKey = {
    UnfilteredEvent: "amf:events:unfiltered",
    FilteredEvent: "amf:events:filtered",
    StartPointByFrame: "amf:startpoints:frame",
    StartPointByTimestamp: "amf:startpoints:timestamp",
} as const satisfies Record<ZSetKeyNameType, ZSetKeyType>;

const activePermission: Permission = {
    readTick: true,
    writeTick: true,
    sendEvent: true,
    subscribeEvent: true,
    subscribeTick: true,
    maxEventPriority: 2,
};

const passivePermission: Permission = {
    readTick: true,
    writeTick: false,
    sendEvent: true,
    subscribeEvent: false,
    subscribeTick: true,
    maxEventPriority: 2,
};

const permissionType = ["active", "passive"] as const;
export type PermissionType = (typeof permissionType)[number];

export const toPermission = (permissionType: PermissionType) => {
    switch (permissionType) {
        case "active":
            return activePermission;
        case "passive":
            return passivePermission;
        default:
            console.warn(
                `invalid permissionType "${permissionType}" was specified.`,
            );
            // message はクライアントに送り返すのでセキュリティリスクを考慮し、入れていない
            throw new InvalidStatusError();
    }
};
