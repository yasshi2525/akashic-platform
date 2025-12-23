import { Event, EventCode, Tick } from "@akashic/playlog";
import { TickFrame, TickPack, toTickList, toTickPack } from "../src/tick";

describe("TickPack", () => {
    describe("Tick[] -> TickPack[]", () => {
        let ev: Event = [EventCode.Join, 0, "test-id", "test-name"];
        it("残りなし, base なし → []", () => {
            expect(toTickPack([])).toEqual([]);
        });
        it("残りなし, base あり → base", () => {
            expect(toTickPack([], [])).toEqual([]);
            expect(toTickPack([], [0])).toEqual([0]);
        });
        it("最後(event なし), base なし → [number]", () => {
            expect(toTickPack([[0]])).toEqual([0]);
        });
        it("最後(event なし), base あり → base appends number", () => {
            expect(toTickPack([[1]], [0])).toEqual([0, 1]);
        });
        it("最後(event あり, base なし → [Tick]", () => {
            const tick: Tick = [0, [ev]];
            expect(toTickPack([tick])).toEqual([tick]);
        });
        it("最後(event あり, base あり → base appends Tick ", () => {
            const tick: Tick = [1, [ev]];
            expect(toTickPack([tick], [0])).toEqual([0, tick]);
        });
        it.each([
            [[0, 1], { from: 0, to: 1 }],
            [[0, 1, 2], { from: 0, to: 2 }],
            [[0, 1, 2, 3], { from: 0, to: 3 }],
        ])(
            "残り複数, 最後までeventなし, base なし → [TickFrame]",
            (list: number[], expected: TickFrame) => {
                expect(toTickPack(list.map((n) => [n]))).toEqual([expected]);
            },
        );
        it.each([
            [[1, 2], { from: 1, to: 2 }],
            [[1, 2, 3], { from: 1, to: 3 }],
            [[1, 2, 4], { from: 1, to: 4 }],
        ])(
            "残り複数, 最後までeventなし, base あり → base appends TickFrame",
            (list: number[], expected: TickFrame) => {
                expect(
                    toTickPack(
                        list.map((n) => [n]),
                        [0],
                    ),
                ).toEqual([0, expected]);
            },
        );
        it("残り複数, 残り先頭がeventあり, base なし → [Tick] + その残り", () => {
            const tick: Tick = [0, ev];
            expect(toTickPack([tick, [1]])).toEqual([tick, 1]);
        });
        it("残り複数, 残り先頭がeventあり, base あり → base appends Tick + その残り", () => {
            const tick: Tick = [1, ev];
            expect(toTickPack([tick, [2]], [0])).toEqual([0, tick, 2]);
        });
        it.each([
            [
                [[0], [1, ev]],
                [0, [1, ev]],
            ],
            [
                [[0], [1, ev], [2]],
                [0, [1, ev], 2],
            ],
            [
                [[0], [1, ev], [2, ev]],
                [0, [1, ev], [2, ev]],
            ],
            [
                [[0], [1, ev], [2], [3]],
                [0, [1, ev], { from: 2, to: 3 }],
            ],
            [
                [[0], [1, ev], [2], [3, ev]],
                [0, [1, ev], 2, [3, ev]],
            ],
            [
                [[0], [1, ev], [2], [3], [4]],
                [0, [1, ev], { from: 2, to: 4 }],
            ],
            [
                [[0], [1, ev], [2], [3], [4, ev]],
                [0, [1, ev], { from: 2, to: 3 }, [4, ev]],
            ],
            [
                [[0], [1, ev], [2], [3], [4, ev], [5]],
                [0, [1, ev], { from: 2, to: 3 }, [4, ev], 5],
            ],
            [
                [[0], [1, ev], [2], [3], [4, ev], [5], [6]],
                [0, [1, ev], { from: 2, to: 3 }, [4, ev], { from: 5, to: 6 }],
            ],
            [
                [[0], [1], [2, ev]],
                [{ from: 0, to: 1 }, [2, ev]],
            ],
            [
                [[0], [1], [2, ev], [3]],
                [{ from: 0, to: 1 }, [2, ev], 3],
            ],
            [
                [[0], [1], [2, ev], [3], [4]],
                [{ from: 0, to: 1 }, [2, ev], { from: 3, to: 4 }],
            ],
        ] as [Tick[], TickPack[]][])(
            "残り複数, 残り先頭はeventなし, base なし → [TickFrame] + その残り",
            (list: Tick[], expected: TickPack[]) => {
                expect(toTickPack(list)).toEqual(expected);
            },
        );
        it.each([
            [
                [[1], [2, ev]],
                [0, 1, [2, ev]],
            ],
            [
                [[1], [2], [3, ev]],
                [0, { from: 1, to: 2 }, [3, ev]],
            ],
        ] as [Tick[], TickPack[]][])(
            "残り複数, 残り先頭はeventなし, base あり → base appends Tick + その残り",
            (list: Tick[], expected: TickPack[]) => {
                expect(toTickPack(list, [0])).toEqual(expected);
            },
        );
    });
    describe("TickPack[] -> Tick[]", () => {
        let ev: Event = [EventCode.Join, 0, "test-id", "test-name"];
        it("number -> [Tick]", () => {
            expect(toTickList(0)).toEqual([[0]]);
        });
        it.each([
            [0, 1, [[0], [1]]],
            [0, 2, [[0], [1], [2]]],
            [0, 3, [[0], [1], [2], [3]]],
        ] as [number, number, Tick[]][])(
            "TickFrame -> Tick[]",
            (from, to, expected: Tick[]) => {
                expect(toTickList({ from, to })).toEqual(expected);
            },
        );
        it("Tick -> [Tick]", () => {
            expect(toTickList([0, ev])).toEqual([[0, ev]]);
        });
    });
});
