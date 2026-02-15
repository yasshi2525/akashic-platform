# webapp

ゲームプラットフォームとして動作するWebアプリケーション実装です。

## Requirement

- PostgreSQL データベース
- Minio コンテンツデータ配信

## NOTE

### `agvw` - `untrusted` について

本Webアプリケーションではゲームスクリプトを `trusted` として扱います。
これは `untrusted` として動作させるために必要な環境設定 (URL構成、DOM要素、config) を特定できなかったためです。
`trusted` として扱うことのリスクは仕様が公開されていないため不明です。

### 静的ファイルについて

コンテンツ（投稿ゲームデータ）は Minio にデプロイされます。一方、
`enfineFileVx_xx_x.js`, `playlogClientVx_x_x.js` は アプリ側で配信してます。
これはファイル更新処理の扱いを決めきれていないための措置です。

### プレイ中の画面のサムネイル画像生成について

プレイ中のスクリーンショットをOGP画像に設定する機能は未実装です。
もし実装する場合、アクティブインスタンス上で画像を生成する必要がありますが、
[@akashic/headless-akashic](https://github.com/akashic-games/headless-akashic) の canvas の png 出力する処理を移植する必要があります。
その場合、[@napi-rs/canvas](https://www.npmjs.com/package/@napi-rs/canvas)などの依存関係が増えるため、負荷上昇が問題ないか検証する必要があります。

### 非サインインユーザーの扱い

#### 名前について

名前は「ゲスト」固定とし、意図的に変更できないようにしています。これは既存のニコ生ゲームが名前固定の前提で作られているための措置です。その代わりユーザー名取得プラグインで任意の名前をつけられるようにしています。

画面を開いたらすぐ遊べることを優先したいため、名前を入力したり、サインインを求めるステップは省いています。

#### サインインへの誘導

プレイ画面からサインイン誘導はあえてしていません。これはサインインしてしまうと参加中のプレイにおいて、別ユーザーと判定されるからです。プレイが始まると名前を変更する仕掛けがない問題もあるため、サインインは非プレイ時にさせるのが望ましいです。

> [!NOTE]
>
> 現状、ゲーム更新時、当該プレイをすべて削除しています。

### メンテナンス（シャットダウン）モード

`/api/internal/shutdown` でメンテナンスモードを切り替えできます。ON 時は次の操作を拒否します。

- 部屋作成
- 部屋延長
- コンテンツ投稿
- コンテンツ更新

この endpoint は HMAC 検証必須です。`SHUTDOWN_HMAC_SECRET` を設定してください。

- Method: `POST`
- Headers:
  - `x-shutdown-timestamp`: エポックミリ秒
  - `x-shutdown-id`: リプレイ防止用の一意ID
  - `x-shutdown-signature`: `hex(hmac_sha256(secret, "${timestamp}.${rawBody}"))`
- Body:
  - `{"enabled": true|false, "reason"?: "..." }`

状態確認は `GET /api/internal/shutdown` で取得できます。
