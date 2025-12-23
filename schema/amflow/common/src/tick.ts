import { Tick, Event, TickIndex } from "@akashic/playlog";
import { InvalidStatusError } from "./error";

/**
 * `from` から `to` の frame の間、イベントが何もなく進んだことを表します。(inclusive)
 */
export interface TickFrame {
    from: number;
    to: number;
}

/**
 * ネットワークトラフィックを節約するため、 {@link Tick} をまとめて送ります。
 *
 * * `number`: frame number without any {@link Event}
 * * {@link TickFrame}: frame interval without any {@link Event}
 * * {@link Tick}: tick with one more {@link Event}
 */
export type TickPack = number | Tick | TickFrame;

export const toTickPack = (list: Tick[], base?: TickPack[]): TickPack[] => {
    const result = base ?? [];
    if (list.length === 0) {
        return result;
    } else if (list.length === 1) {
        if (!list[0][TickIndex.Events]) {
            result.push(list[0][TickIndex.Frame]);
        } else {
            result.push(list[0]);
        }
        return result;
    } else {
        let idx = 0;
        for (; idx < list.length && !list[idx][TickIndex.Events]; idx++) {}
        if (idx === 0) {
            result.push(list[0]);
            return toTickPack(list.slice(1), result);
        } else if (idx === 1) {
            result.push(list[0][TickIndex.Frame]);
            return toTickPack(list.slice(1), result);
        } else {
            result.push({
                from: list[0][TickIndex.Frame],
                to: list[idx - 1][TickIndex.Frame],
            });
            if (idx === list.length) {
                return result;
            } else {
                return toTickPack(list.slice(idx), result);
            }
        }
    }
};

export const toTickList = (
    pack: TickPack,
    cb?: (err: Error | null) => void,
) => {
    if (isNumber(pack)) {
        return [[pack]] as Tick[];
    } else if (isTick(pack)) {
        return [pack as Tick];
    } else if (isTickFrame(pack)) {
        return new Array(pack.to - pack.from + 1)
            .fill(undefined)
            .map((_, i) => [pack.from + i] as Tick);
    } else {
        if (cb) {
            cb(
                new InvalidStatusError(
                    "received invalid pack: typeof value is invalid.",
                ),
            );
        }
        return [];
    }
};

const isTickFrame = (pack: TickPack): pack is TickFrame =>
    typeof pack === "object" &&
    !Array.isArray(pack) &&
    "from" in pack &&
    typeof pack.from === "number" &&
    "to" in pack &&
    typeof pack.to === "number" &&
    pack.from <= pack.to;

const isTick = (pack: TickPack): pack is Tick =>
    typeof pack === "object" &&
    Array.isArray(pack) &&
    pack.length > 0 &&
    typeof pack[0] === "number";

const isNumber = (pack: TickPack): pack is number => typeof pack === "number";

export const convertTickPack = {
    isTickFrame,
    isTick,
    isNumber,
} as const;
