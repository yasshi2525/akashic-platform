# SES メール送信・受信のセットアップ

通報・問い合わせの運営通知メール（送信）と、運営窓口メール `support@example.com`（受信）の構成手順。本番リージョンは `ap-northeast-1`（東京）を前提とする。

webapp 側のコードは `SES_FROM_ADDRESS` と `SES_ADMIN_ADDRESS` が両方設定されたときだけメールを送る。未設定なら通報・問い合わせは DB 保存のみで正常動作する（[webapp/lib/server/mail.ts](../webapp/lib/server/mail.ts)）。

## 環境変数（webapp）

| 変数                                | 用途                                                                                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SES_FROM_ADDRESS`                  | 送信元。例 `noreply@example.com`（Custom MAIL FROM 配下）                                                                                                     |
| `SES_ADMIN_ADDRESS`                 | 通報・問い合わせの通知先。運営が読む受信箱。support@ を Lambda で転送する構成なら `support@example.com` 自体でよい（転送先の管理を forwarder に一元化できる） |
| `SES_REGION`                        | 省略時は `S3_REGION` → `us-east-1` の順でフォールバック                                                                                                       |
| `SES_ENDPOINT`                      | ローカルの疑似 SES を使う場合のみ。本番は未設定                                                                                                               |
| `SES_ACCESS_KEY` / `SES_SECRET_KEY` | 本番は未設定にして IAM ロールの既定認証情報を使う（S3 と同じ方針）                                                                                            |

IAM ロールには `ses:SendEmail` を許可する。

`SES_ADMIN_ADDRESS` を `support@example.com` にすると、通知メールは「SES 送信 → MX → SES 受信 → S3 保存 → Lambda → 個人 Gmail へ転送」という一往復を経由する。以下だけ注意する。

- 転送先（`aws-lambda-ses-forwarder` の `forwardMapping`）に `support@example.com` 自身など受信ルール対象のアドレスを入れない。転送ループになる。
- 受信バケットには通知メールも溜まる。ライフサイクルルールで一定期間後に削除する。
- 転送 Lambda が壊れると通知も問い合わせも同時に止まる。原本は S3 に残るので後から追える。

## 送信（Sending）

1. **ドメイン検証 + Easy DKIM**: SES コンソールで `example.com` を verified identity として登録し、Easy DKIM の CNAME 3 本を DNS に追加。
2. **Custom MAIL FROM**: サブドメイン `mail.example.com` を MAIL FROM に設定（MX と SPF の TXT を追加）。apex ドメインの評判を巻き込まないため。
3. **SPF**: `mail` サブドメインに `v=spf1 include:amazonses.com -all`。
4. **DMARC**: `_dmarc.example.com` に `p=none` で開始し、レポートを見ながら `quarantine` → `reject` と段階的に締める。
5. **サンドボックス解除申請**: 未申請だと検証済みアドレス宛にしか送れず、1 日 200 通・1 通/秒に制限される。本番前に「Request production access」を申請する。
6. **バウンス/苦情ハンドリング**: Configuration Set を作り、SNS トピック経由でバウンス・苦情を受ける。苦情率 0.1% / バウンス率 5% を超えるとアカウントレビュー対象。

## 受信（Receiving）— support@ を個人 Gmail へ転送（案B）

ap-northeast-1 は SES の受信に対応（`inbound-smtp.ap-northeast-1.amazonaws.com`）。東京リージョンで完結できる。

1. **MX レコード**: `example.com` の MX を `10 inbound-smtp.ap-northeast-1.amazonaws.com` に。
2. **受信ルールセット**: 宛先 `support@example.com` を S3 に保存し、Lambda を起動するルールを作る。
3. **Lambda で転送**: 受信メールを個人 Gmail へ転送する。素朴に転送すると転送元の SPF が壊れて Gmail に弾かれるため、Lambda で以下を行う（`aws-lambda-ses-forwarder` が定番実装）:
   - `From:` を `support@example.com`（自ドメイン）に書き換える
   - `Reply-To:` に元の送信者を入れる
4. **返信**: Gmail の「名前を指定して送信（send mail as）」で `support@example.com` を追加し、SES SMTP 認証情報で送信する。差出人を support@ にして返信できる（次節）。

### support@ として問い合わせに返信する

問い合わせフォームで返信先アドレスが入力されると、webapp は通知メールの `Reply-To` にそれを入れて送る。`aws-lambda-ses-forwarder` は既存の `Reply-To` を上書きしないため、転送されてきたメールに Gmail で「返信」すると宛先は自動的に問い合わせ者になる。あとは差出人を support@ にするだけで、利用者からは support@ とのやり取りに見える。個人 Gmail のアドレスは相手に出ない。

セットアップ（1 回だけ）:

1. **サンドボックス解除が前提**。未解除だと検証済みアドレス以外に送れないので、問い合わせ者へ返信できない。
2. SES コンソール → **SMTP settings** → 「Create SMTP credentials」で SMTP ユーザー名・パスワードを発行する（実体は IAM ユーザー）。
3. Gmail → 設定 → **アカウントとインポート** → 「他のメールアドレスを追加」で `support@example.com` を追加。「エイリアスとして扱う」は ON。SMTP サーバーは **`email-smtp.ap-northeast-1.amazonaws.com` / ポート 587 / TLS**、ユーザー名・パスワードは 2 で発行したもの。
   - ここで Gmail 側のサーバーを選ぶと、DMARC 上は Gmail から自ドメイン名義で送ることになり弾かれる。必ず SES の SMTP を指定する。
4. 追加時の確認コードは `support@example.com` 宛に届き、通常の受信フロー（S3 → Lambda → 転送）で Gmail に落ちてくる。それを入力して完了。
5. 「デフォルトの返信モード」を「メールを受信したアドレスから返信する」にしておく。ただし転送メールは `Delivered-To` が個人アドレスのため support@ が自動選択されないことがある。**送信前に差出人が support@ になっているか都度確認する**。

利用者が返信すると再び MX → SES 受信 → 転送で Gmail に届くので、以降は同じスレッド上でやり取りが続く。

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
