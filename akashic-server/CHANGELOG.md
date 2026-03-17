# CHANGELOG

## 1.3.1

- Feature
  - ゲームの異常終了・エラーログ出力をゲーム投稿主に通知する機能を追加
    - ゲームが異常終了した場合 (`errorTrigger` で catch)、投稿主に **「ゲームがエラーで異常終了しました」** と通知する (重要度: 高)
    - プレイ中に `console.error` への出力があった場合、投稿主に **「ゲームの実行中にエラーログが出力されました」** と通知する (重要度: 低、同一プレイで1回のみ)
    - いずれの通知からも、該当プレイのログビューアー (`/game-log/{contentId}/{playId}`) へ直接遷移できる
  - プレイのゲームログを S3 へアップロードする機能を追加
    - プレイ終了時に、そのプレイで出力された全ログ (info / warn / error) を JSONL 形式で S3 に保存する (`play-logs/{contentId}/{playId}.jsonl`)
    - ログは投稿主のみ閲覧可能 (`GET /api/play-log/{contentId}/{playId}`)

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
