# Akashic Platform

> [!CAUTION]
> このプロジェクトは実装中です。まだ動かないよ

[dwango](https://dwango.co.jp/) 提供の [Akashic Engine](https://akashic-games.github.io/) のマルチプレイモードに準拠したゲームをプレイ可能にする Web サービス実装です。

- 用語

  - ゲーム: ユーザーが投稿したもの
  - プレイ: ゲームを起動したもの

- メイン機能

  - ゲーム投稿
  - プレイ開始
  - プレイ参加

- 機能要件
  - ユーザー登録
  - ゲーム一覧
  - プレイ一覧
  - ユーザー名取得プラグインの代替実装

## リポジトリ構成

### client

ゲームプラットフォームとして機能するクライアント Web アプリケーション

### server

ゲームプラットフォームとして機能するサーバーアプリケーション

### schema

クライアント・サーバー両者で必要なスキーマ定義置き場

### public

静的ファイルを配信する Web サーバー。
ゲームスクリプト、ゲームアセット、ゲーム設定ファイルなど。

### akashic-client

ブラウザ上に表示されるプレイのビューアー。
`akashic serve` がデバッグ用の作りのため独自に実装します。

### agvw-like

ビューアーの基盤モジュールです。[`@akashic/agvw`](https://github.com/akashic-games/agvw) を元に制作しています。

### playlogClient-like

[`@akashic/agvw`](https://github.com/akashic-games/agvw) が使用している `playlogClient` モジュールの実装です。当該モジュールのソースが公開されていないため、独自に実装しています。

### akashic-server

プレイごとに起動されるサーバー。
`akashic sever` がクライアントと密結合なため独自に実装します。

### akashic-storage

プレイ時の実行時情報の保存と配信機能。
`akashic sever` のメモリ効率が悪いため独自に実装します。

## LICENSE

- [MIT License](./LICENSE)

> [!IMPORTANT]
>
> [`./agvw-like`](./agvw-like/) は DWANGO Co., Ltd. が [MIT License](https://github.com/akashic-games/agvw/blob/main/LICENSE) で公開している [`@akashic/agvw`](https://github.com/akashic-games/agvw) をリバースエンジニアリングにして作成したものです。
> 詳細は [`./agvw-like/README.md`](./agvw-like/README.md) を参照してください。

## Author

- yasshi2525 ([X](https://x.com/yasshi2525))
