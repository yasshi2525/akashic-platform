# CHANGELOG

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
