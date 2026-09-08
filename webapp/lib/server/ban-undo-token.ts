import { createHmac, timingSafeEqual } from "node:crypto";
import { User } from "../types";

/**
 * ゲーム内BANの直後に出すトーストの「取り消す」で、対象を名指しするための署名。
 *
 * WHY: kick が成功すると対象の PlaySession は消えるため、in-game playerId から
 * 視聴者を引き直せなくなる。かといって発行者の BAN 一覧を引き当てに使うと、
 * この部屋に来たことのない相手（他の部屋で BAN した相手）まで解決でき、
 * コンテンツが無関係な BAN を解除できてしまう。BAN したその時にサーバーが
 * 発行したこの token だけが、その部屋のその対象を指せる。
 *
 * token は対象の指定にしか使えない。解除の認可は verifyRoomOwner で別途行うので、
 * これを持っていても部屋主でなければ何もできない。
 */
const TTL_MS = 60 * 60 * 1000;

function getSecret() {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
        throw new Error("AUTH_SECRET is required.");
    }
    return secret;
}

function sign(payload: string) {
    // next-auth の JWT や他の Cookie と鍵素材を共有しないようラベルで分離する
    return createHmac("sha256", `ban-undo:${getSecret()}`)
        .update(payload)
        .digest("base64url");
}

interface BanUndoPayload {
    playId: number;
    authType: User["authType"];
    id: string;
    expiresAt: number;
}

export function issueBanUndoToken(
    playId: number,
    target: Pick<User, "authType" | "id">,
): string {
    const payload: BanUndoPayload = {
        playId,
        authType: target.authType,
        id: target.id,
        expiresAt: Date.now() + TTL_MS,
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `${encoded}.${sign(encoded)}`;
}

/** 署名と部屋が一致すれば対象の視聴者を返す。偽造・期限切れ・別部屋は null */
export function verifyBanUndoToken(
    token: string | undefined,
    playId: number,
): Pick<User, "authType" | "id"> | null {
    if (!token) {
        return null;
    }
    const separator = token.indexOf(".");
    if (separator < 0) {
        return null;
    }
    const encoded = token.slice(0, separator);
    const signature = token.slice(separator + 1);
    const expected = sign(encoded);
    const actualBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expected);
    if (actualBuf.length !== expectedBuf.length) {
        return null;
    }
    if (!timingSafeEqual(actualBuf, expectedBuf)) {
        return null;
    }
    let payload: BanUndoPayload;
    try {
        payload = JSON.parse(
            Buffer.from(encoded, "base64url").toString("utf8"),
        ) as BanUndoPayload;
    } catch {
        return null;
    }
    if (payload.playId !== playId) {
        return null;
    }
    if (
        !Number.isSafeInteger(payload.expiresAt) ||
        payload.expiresAt <= Date.now()
    ) {
        return null;
    }
    if (payload.authType !== "oauth" && payload.authType !== "guest") {
        return null;
    }
    if (!payload.id) {
        return null;
    }
    return { authType: payload.authType, id: payload.id };
}
