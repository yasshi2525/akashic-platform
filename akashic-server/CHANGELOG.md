# CHANGELOG

## 1.4.1

- 5分間参加者がいなければ自動部屋終了

## 1.4.0

- Feature
  - トレース記録用設定追加

## 1.3.6

- Improve
  `playlogClient` の `maxPreservingTickSize` を設定する環境変数 (`MAX_PRESERVING_TICK_SIZE`) を追加。未設定時は `0`

## 1.3.5

- Misc
  - Update dependencies.

## 1.3.4

- Improve
  - HTTPレスポンス時、明示的に Content-Type を指定するよう修正

## 1.3.3

- Improve
  - `console.error` 出力の場合、スタックトレースを追加出力するよう修正

## 1.3.2

- Feature
  - プレイ終了時、プレイヤーからログ報告があった場合、ゲーム投稿主に通知するよう修正

## 1.3.1

- Feature
  - プレイのゲームログを S3 にアップロードする機能を追加
  - アクティブインスタンスが異常終了（`errorTrigger` でcatch）するか、プレイ中に `console.error` が出力された場合、通知レコードを作成するよう修正

## 1.3.0

- Feature
  - ユーザー投稿ゲームのログに PlayID, ContentID を埋め込む機能を追加

## 1.2.0

- Feature
  - 入室にキーワードが必要な限定部屋を作成する機能を追加

## 1.1.0

- Misc
  - `akashic-storage` の Socket.IO 接続先 URL 変更にともなう接続先変更

## 1.0.2

- Misc
  - `*.pem` をカレントディレクトリに配置するよう修正

## 1.0.1

- Misc
  - `*.pem` がある場合、コンテナに含めるように

## 1.0.0

公開
