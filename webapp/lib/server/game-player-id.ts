import { createHmac } from "node:crypto";
import { User } from "../types";

/**
 * ゲーム（Akashic）に申告する in-game playerId。ゲストの guest_id は認証 Cookie の
 * 秘密だが、in-game playerId は Join/イベントで参加者に配布され公開される。両者を
 * 同一にすると参加者が guest_id を学習して Cookie に詐称し、発言・ミュート・BAN の
 * identity をなりすませてしまう。よってゲストは guest_id の非可逆な派生値を使い、
 * guest_id 自体は一切ゲームに出さない。OAuth の userId は公開情報かつ認証は
 * セッションで守られるためそのまま使う。
 *
 * 派生は決定的なので同一 guest_id（同一端末）は常に同一 playerId になり、ゲーム上も
 * 同一プレイヤーとして扱われる。playId を混ぜないため部屋をまたぐと相関しうるが、
 * guest_id そのものではないので詐称は防げる（in-game id ＝ guest_id だった従来より安全）。
 */
const KEY_LENGTH = 16;

function getSecret() {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
        throw new Error("AUTH_SECRET is required.");
    }
    return secret;
}

export function gamePlayerId(user: Pick<User, "authType" | "id">): string {
    if (user.authType === "oauth") {
        return user.id;
    }
    // next-auth の JWT や他の Cookie と鍵素材を共有しないようラベルで分離する
    return createHmac("sha256", `game-player:${getSecret()}`)
        .update(user.id)
        .digest("base64url")
        .slice(0, KEY_LENGTH);
}
