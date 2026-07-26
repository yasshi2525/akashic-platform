import { sliceTransferData } from "../src/transfer";

describe("sliceTransferData", () => {
    it("maxLength が 0 以下なら例外", () => {
        expect(() => sliceTransferData("abc", 0)).toThrow();
        expect(() => sliceTransferData("abc", -1)).toThrow();
    });
    it("空文字列でも 1 件返す", () => {
        expect(sliceTransferData("", 4)).toEqual([""]);
    });
    it("maxLength 以下なら分割しない", () => {
        expect(sliceTransferData("abc", 3)).toEqual(["abc"]);
        expect(sliceTransferData("abc", 4)).toEqual(["abc"]);
    });
    it("maxLength ごとに分割する", () => {
        expect(sliceTransferData("abcdefg", 3)).toEqual(["abc", "def", "g"]);
    });
    it("割り切れる場合、末尾に空文字列を足さない", () => {
        expect(sliceTransferData("abcdef", 3)).toEqual(["abc", "def"]);
    });
    it("結合すると元に戻る", () => {
        const src = "0123456789abcdef";
        for (let len = 1; len <= src.length + 1; len++) {
            expect(sliceTransferData(src, len).join("")).toBe(src);
        }
    });
    describe("サロゲートペア", () => {
        // "𩸽" は 2 単位のサロゲートペア
        const fish = "𩸽";
        it("境界がペアの間に来たら 1 文字ずらす", () => {
            expect(sliceTransferData(`a${fish}b`, 2)).toEqual([
                `a${fish}`,
                "b",
            ]);
        });
        it("ペア単独でも分割されない", () => {
            expect(sliceTransferData(fish, 1)).toEqual([fish]);
        });
        it("分割後の各断片が単独で正しい UTF-16 列になる", () => {
            // NOTE: encodeURIComponent は単独のサロゲートを含む文字列で例外を投げるため、
            // 断片が UTF-8 へ変換可能かの判定に使える
            const src = `a${fish}b${fish}${fish}c`;
            for (let len = 1; len <= src.length; len++) {
                for (const part of sliceTransferData(src, len)) {
                    expect(() => encodeURIComponent(part)).not.toThrow();
                }
            }
        });
        it("結合すると元に戻る", () => {
            const src = `a${fish}b${fish}${fish}c`;
            for (let len = 1; len <= src.length + 1; len++) {
                expect(sliceTransferData(src, len).join("")).toBe(src);
            }
        });
    });
});
