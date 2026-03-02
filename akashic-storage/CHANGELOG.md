# CHANGELOG

## 1.1.1

- Bug Fix
  - 同一tickに複数のEventがある場合、 `getTickList` が不適切な範囲のTick情報を返却する問題を修正

## 1.1.0

- Misc
  - ルートパス以外でもリクエストを受け付ける `BASE_PATH` を追加
  - Socket.IO 接続受付先を `BASE_PATH/socket.io` に変更

## 1.0.2

- Misc
  - Valkey Cluster mode の元で動作するよう修正

## 1.0.1

- Misc
  - 環境変数 `INFLIGHT_REQUEST_LIMIT` で `inflightRequestsLimit` を変更できるように修正

## 1.0.0

公開
