import { createHmac } from "node:crypto";

/**
 * 投稿者を閲覧者ごとに異なる値で指すための匿名キー。
 *
 * ゲストの内部 ID をそのまま返すと、掲示板と各部屋の投稿を突き合わせて
 * 同一人物を追跡できてしまう。一方で端末内ミュートを掲示板・部屋をまたいで
 * 引き継ぐには、閲覧者から見て安定した識別子が要る。
 * 閲覧者 ID を鍵素材に混ぜることで、同じ閲覧者から見れば常に同じ値、
 * 別の閲覧者から見れば別の値になり、利用者同士が値を突き合わせても
 * 同一人物と特定できない。
 */
const KEY_LENGTH = 12;

function getSecret() {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
        throw new Error("AUTH_SECRET is required.");
    }
    return secret;
}

export interface AnonKeySubject {
    authorId?: string | null;
    guestId?: string | null;
}

export function anonKey(
    subject: AnonKeySubject,
    viewerId: string,
): string | undefined {
    const target = subject.authorId
        ? `user:${subject.authorId}`
        : subject.guestId
          ? `guest:${subject.guestId}`
          : undefined;
    if (!target) {
        return undefined;
    }
    // next-auth の JWT や入室 Cookie と鍵素材を共有しないようラベルで分離する
    return createHmac("sha256", `anon-key:${getSecret()}`)
        .update(`${target}:${viewerId}`)
        .digest("base64url")
        .slice(0, KEY_LENGTH);
}
