-- 既存の重複 BAN を除去してから一意インデックスを張る（重複が残っていると
-- インデックス作成に失敗するため）。同一グループの最小 id を残す。
DELETE FROM "Ban" a
USING (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY
                "gmUserId",
                "gmGuestId",
                "playId",
                "targetUserId",
                "targetGuestId",
                "origin"
            ORDER BY id
        ) AS rn
    FROM "Ban"
) b
WHERE a.id = b.id AND b.rn > 1;

-- 同一の論理 BAN（同じ発行者・スコープ・対象・由来）の重複作成を防ぐ。
-- 各カラムは nullable のため、NULL 同士も等価に扱う NULLS NOT DISTINCT を使う
-- （PostgreSQL 15+）。Prisma は NULLS 節を扱わないので schema.prisma 側は
-- 素の @@unique（同名）として保持され drift は出ない。
CREATE UNIQUE INDEX "Ban_owner_scope_target_origin_key"
    ON "Ban" (
        "gmUserId",
        "gmGuestId",
        "playId",
        "targetUserId",
        "targetGuestId",
        "origin"
    ) NULLS NOT DISTINCT;
