# CHANGELOG

## 1.2.2

- Feature
  - `./webapp`
    - [`@akashic-extension/coe`](https://github.com/akashic-games/coe) を使用するゲームの実行に対応

- Bug Fix
  - `./webapp`
    - `S3_KEY_PREFIX` 指定時、ゲーム更新（アイコン更新なし）に失敗する問題を修正

- Misc
  - `./webapp`
    - ゲームアイコンが更新される度にURLがユニークになるよう修正 (#14)
  - `./agvw-like`
    - `GameContent` の `argument` を `any` に修正

## 1.2.1

- Misc
  - `./webapp`
    - カスタムフッターレイアウト改善

## 1.2.0

- Feature
  - `./webapp`
  - `./manager-server`
    - ドレイン機能追加

## 1.1.4

- Misc
  - `./webapp`
    - カスタムフッター追加

## 1.1.3

- Misc
  - `./webapp`
    - `1.1.1`, `1.1.2` の変更をロールバック

## ~~1.1.2~~

- ~~Misc~~
  - ~~`./webapp`~~
    - ~~ゲーム投稿・更新処理についても、署名付きURLを取得する方式に変更~~

## ~~1.1.1~~

- ~~Misc~~
  - ~~`./webapp`~~
    - ~~ファイルアップロード時、署名付きURLを取得する方式に変更~~

## 1.1.0

- Feature
  - `./webapp`
    - プレイ画面のスクリーンショット共有機能を追加 (#4)
    - Xに部屋のURLを投稿する機能を追加 (#4)

- Misc
  - `./webapp`
    - ゲーム一覧レイアウトの改善
    - Socket.IO 接続先 URL 変更にともなう接続先変更
    - S3 Bucket 格納先のキープレフィックス `S3_KEY_PREFIX` を追加
  - `./akashic-storage`
    - ルートパス以外でもリクエストを受け付ける `BASE_PATH` を追加
    - Socket.IO 接続受付先を `BASE_PATH/socket.io` に変更
  - `./akashic-server`
    - Socket.IO 接続先 URL 変更にともなう接続先変更
  - `./playlogClient-like`
    - Socket.IO 接続先がルートパスでない場合も接続できるよう改善
  - other
    - Docker Compose で起動停止を繰り返すと Valkey Cluster の起動が不安定になる問題を修正

## 1.0.9

- Feature
  - `./webapp`
    - プレイ中の音量調整機能を追加

- Misc
  - `./webapp`
    - ヘルプページ追加
    - ゲーム説明文セル/ボックスの改行ルール改善
    - フッターレイアウト改善
  - other
    - Docker Compose で起動停止を繰り返すと Valkey Cluster の起動が不安定になる問題を修正

## 1.0.8

- Misc
  - `./webapp`
    - 利用規約・プライバシーポリシー追加 (#5)
    - スマートフォン環境での視認性を改善 (#8)

## 1.0.7

- Bug Fix
  - `./webapp`
    - DOMアクセスするコンテンツがニコ生と同等の動作をするよう修正
  - other
    - Docker Compose で起動停止を繰り返すと Valkey Cluster の起動が不安定になる問題を修正

## 1.0.6

- Misc
  - `./akashic-storage`
    - Amazon ElastiCache に接続できるよう修正

## 1.0.5

- Misc
  - `./akashic-storage`
    - `GlideClientConfiguration.inflightRequestsLimit` を変更できるように修正

## 1.0.4

- Bug Fix
  - `./webapp`
    - ライセンスファイル情報が表示できない問題を修正

## 1.0.3

- Bug Fix
  - Twitter でサインインできない問題を修正

## 1.0.2

- Misc
  - `./akashic-server`
  - `./webapp`
    - `*.pem` をカレントディレクトリに配置するよう修正

## 1.0.1

- Misc
  - `./akashic-server`
  - `./webapp`
  - `./schema/persist`
    - `*.pem` がある場合、コンテナに含めるように

## 1.0.0

公開
