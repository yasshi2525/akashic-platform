import { User } from "../types";

/**
 * 閲覧者と投稿者が同一人物か、認証種別を含めて判定する。
 *
 * ゲストは guest_id cookie を任意の値（公開されている他人の OAuth user id 等）に
 * 設定できるため、生の id 一致だけで比べると別人を自分自身と誤認する。authType は
 * next-auth のセッション検証由来で詐称できないので、これを名前空間として使い、
 * oauth 閲覧者は authorId のみ、guest 閲覧者は guestId のみと突き合わせる。
 */
export function isSameViewer(
    subject: { authorId?: string | null; guestId?: string | null },
    viewer: Pick<User, "authType" | "id"> | null | undefined,
): boolean {
    if (!viewer) {
        return false;
    }
    if (viewer.authType === "oauth") {
        return !!subject.authorId && subject.authorId === viewer.id;
    }
    return !!subject.guestId && subject.guestId === viewer.id;
}

/**
 * 視聴者がこの部屋の部屋主(GM)本人か、認証種別を含めて判定する。
 * `gmUserId` が入っていれば GM はサインイン利用者なので oauth 閲覧者のみ、
 * 無ければゲスト部屋主なので guest 閲覧者のみと突き合わせる。生 id 比較だと
 * ゲストが部屋主の公開 OAuth id を騙って GM 認可を得られてしまう。
 */
export function isRoomOwner(
    play: { gameMasterId: string; gmUserId: string | null },
    viewer: Pick<User, "authType" | "id"> | null | undefined,
): boolean {
    if (!viewer) {
        return false;
    }
    return play.gmUserId
        ? viewer.authType === "oauth" && viewer.id === play.gmUserId
        : viewer.authType === "guest" && viewer.id === play.gameMasterId;
}

/**
 * PlaySession に記録する視聴者識別子。認証種別を接頭辞にして名前空間を分け、
 * ゲストが他人の id を騙っても別ユーザーの session と衝突しないようにする。
 */
export function sessionViewerId(viewer: Pick<User, "authType" | "id">): string {
    return `${viewer.authType}:${viewer.id}`;
}

/**
 * BAN 対象（authorId か guestId のどちらか）から、sessionViewerId と同形式の
 * kick 用識別子を導く。oauth 投稿者は authorId、ゲスト投稿者は guestId を使う。
 */
export function targetSessionViewerId(target: {
    authorId?: string | null;
    guestId?: string | null;
}): string | null {
    if (target.authorId) {
        return `oauth:${target.authorId}`;
    }
    if (target.guestId) {
        return `guest:${target.guestId}`;
    }
    return null;
}
