# SES メール送信・受信のセットアップ

通報・問い合わせの運営通知メール（送信）と、運営窓口メール `support@multi-indiegame.net`（受信）の構成手順。本番リージョンは `ap-northeast-1`（東京）を前提とする。

webapp 側のコードは `SES_FROM_ADDRESS` と `SES_ADMIN_ADDRESS` が両方設定されたときだけメールを送る。未設定なら通報・問い合わせは DB 保存のみで正常動作する（[webapp/lib/server/mail.ts](../webapp/lib/server/mail.ts)）。

## 環境変数（webapp）

| 変数                                | 用途                                                                |
| ----------------------------------- | ------------------------------------------------------------------- |
| `SES_FROM_ADDRESS`                  | 送信元。例 `noreply@multi-indiegame.net`（Custom MAIL FROM 配下）   |
| `SES_ADMIN_ADDRESS`                 | 通報・問い合わせの通知先。運営が読む受信箱（転送先の個人 Gmail 等） |
| `SES_REGION`                        | 省略時は `S3_REGION` → `ap-northeast-1` の順でフォールバック        |
| `SES_ENDPOINT`                      | ローカルの疑似 SES を使う場合のみ。本番は未設定                     |
| `SES_ACCESS_KEY` / `SES_SECRET_KEY` | 本番は未設定にして IAM ロールの既定認証情報を使う（S3 と同じ方針）  |

IAM ロールには `ses:SendEmail` を許可する。

## 送信（Sending）

1. **ドメイン検証 + Easy DKIM**: SES コンソールで `multi-indiegame.net` を verified identity として登録し、Easy DKIM の CNAME 3 本を DNS に追加。
2. **Custom MAIL FROM**: サブドメイン `mail.multi-indiegame.net` を MAIL FROM に設定（MX と SPF の TXT を追加）。apex ドメインの評判を巻き込まないため。
3. **SPF**: `mail` サブドメインに `v=spf1 include:amazonses.com -all`。
4. **DMARC**: `_dmarc.multi-indiegame.net` に `p=none` で開始し、レポートを見ながら `quarantine` → `reject` と段階的に締める。
5. **サンドボックス解除申請**: 未申請だと検証済みアドレス宛にしか送れず、1 日 200 通・1 通/秒に制限される。本番前に「Request production access」を申請する。
6. **バウンス/苦情ハンドリング**: Configuration Set を作り、SNS トピック経由でバウンス・苦情を受ける。苦情率 0.1% / バウンス率 5% を超えるとアカウントレビュー対象。

## 受信（Receiving）— support@ を個人 Gmail へ転送（案B）

ap-northeast-1 は SES の受信に対応（`inbound-smtp.ap-northeast-1.amazonaws.com`）。東京リージョンで完結できる。

1. **MX レコード**: `multi-indiegame.net` の MX を `10 inbound-smtp.ap-northeast-1.amazonaws.com` に。
2. **受信ルールセット**: 宛先 `support@multi-indiegame.net` を S3 に保存し、Lambda を起動するルールを作る。
3. **Lambda で転送**: 受信メールを個人 Gmail へ転送する。素朴に転送すると転送元の SPF が壊れて Gmail に弾かれるため、Lambda で以下を行う（`aws-lambda-ses-forwarder` が定番実装）:
   - `From:` を `support@multi-indiegame.net`（自ドメイン）に書き換える
   - `Reply-To:` に元の送信者を入れる
4. **返信**: Gmail の「名前を指定して送信（send mail as）」で `support@multi-indiegame.net` を追加し、SES SMTP 認証情報で送信する。差出人を support@ にして返信できる。

### 2026年1月の Gmail 仕様変更について

廃止されたのは「他のアカウントのメールを確認（POP 方式）」と Gmailify。**転送による受信と SMTP 経由の send-as 送信は継続**するため、この案B構成は影響を受けない。逆に「Gmail から POP で取りに行く」構成は壊れるので採用しない。

## 運用

- 管理 UI は設けない。通報・問い合わせは通知メールで気づき、詳細は psql で確認する。
- 通報は握り潰さず 1 件ずつ記録する。同じ対象への複数通報（補足やカテゴリ違いを含む）は証跡として残し、確認時に対象単位でグループ化して見る。
  - グループ化して未対応をトリアージ:
    ```sql
    SELECT "targetType", "targetId",
           count(*) AS reports,
           array_agg(DISTINCT reason) AS reasons,
           max("bodySnapshot") AS snapshot,
           min("createdAt") AS first_at,
           max("createdAt") AS last_at
    FROM "Report" WHERE status = 'OPEN'
    GROUP BY "targetType", "targetId"
    ORDER BY reports DESC, last_at DESC;
    ```
  - 対象を絞って個々の通報（補足・通報者）を確認:
    ```sql
    SELECT * FROM "Report"
    WHERE "targetType" = 'BOARD_MESSAGE' AND "targetId" = '123'
    ORDER BY "createdAt";
    ```
  - 対応したら対象単位で status を更新:
    ```sql
    UPDATE "Report" SET status = 'ACTIONED'
    WHERE "targetType" = 'BOARD_MESSAGE' AND "targetId" = '123' AND status = 'OPEN';
    ```
  - 問い合わせ: `SELECT * FROM "ContactMessage" WHERE status = 'OPEN' ORDER BY "createdAt";`
- メールアドレスはサイトに直書きしない。一次窓口は問い合わせフォーム `/contact`、返信が必要な場合のみ support@ から個別に返す。
