# Akashic Platform

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

- 実行可能なゲーム
  - `environment.sandbox-runtime`: `"3"`
  - `environment.nicolive.supportedModes`: `"multi_admission"` または `"multi"`
  - `environment.external`: `"coeLimited"` のみ対応。 `@akashic-extension/instance-storage` は機能しない点に注意

## 構成図

本プラットフォームは以下の3つのプロセスから構成されます。

- akashic-server
  実行中の各プレイの実処理を進める。
- akashic-storage
  実行中の全プレイ情報を保管する。
- webapp
  各種操作できるWebアプリケーション

![アーキテクチャ図](./architecture.png)

Web API 仕様: https://yasshi2525.github.io/akashic-platform/

## リポジトリ構成

### webapp

ゲームプラットフォームとして機能する Web アプリケーション 実装

### schema

クライアント・サーバー両者で必要なスキーマ定義置き場

### agvw-like

ビューアーの基盤モジュールです。[`@akashic/agvw`](https://github.com/akashic-games/agvw) を元に制作しています。

### playlogClient-like

[`@akashic/agvw`](https://github.com/akashic-games/agvw) が使用している `playlogClient` モジュールの実装です。当該モジュールのソースが公開されていないため、独自に実装しています。

### akashic-server

プレイごとにアクティブインスタンスを起動するサーバー。
`akashic serve` がクライアントと密結合なため独自に実装します。

### akashic-storage

プレイ時の実行時情報の保存と配信機能。
`akashic serve` のメモリ効率が悪いため独自に実装します。

## インストール方法・使い方

### Docker Compose (推奨)

#### 前提ソフトウェア

- Docker

#### セットアップ

`.env.example` の記述を参考に `.env` を配置してください。

`AUTH_SECRET` には下記を参考に 32byte の base64 文字列を指定してください。

##### 設定例：

```sh
openssl rand -base64 33
<abcd...>
```

`.env`

```sh
AUTH_SECRET="<abcd...>"
```

#### 実行方法

```sh
docker compose up
```

`http://localhost:3000` にアクセスするとゲームで遊ぶことができます。

### スタンドアロンサーバー

#### 前提ソフトウェア

- Node.js
- PostgreSQL: ユーザー・ゲーム情報・プレイ情報の保管
- Valkey: ゲーム実行時情報の保管
- Minio: コンテンツデータ（投稿ゲームデータ）の保管

Valkey の JavaScript Client の制約により、Windows OS上では動作しません。(WSL上ならOK)

#### インストール

```sh
npm install
```

#### セットアップ

##### schema/persist, akashic-storage, akashic-server

`.env.example` の記述を参考に `.env` を配置してください。

##### webapp

`.env.example` の記述を参考に `.env` を配置してください。

```sh
npx -w ./webapp auth secret
```

`.env.local` が作成されます。

#### 実行方法

> [!NOTE]
>
> 下記3つは現状、すべてフォアグラウンドで実行されます

```sh
npm run run -w ./akashic-storage
npm run run -w ./akashic-server
npm run dev -w ./webapp
```

設定変更は `./schema/persist`, `./akashic-storage`, `./akashic-server`, `./webapp` 配下に `.env` を置くことでできます。 `.env.example` を参考にしてください。

`http://localhost:3000` にアクセスするとゲームで遊ぶことができます。

## LICENSE

- Source code
  - [MIT License](./LICENSE)

- Rendered Image
  - [`./webapp/public/image/icon.png`](./webapp/public/image/icon.png), [`./webapp/public/favicon.ico`](./webapp/public/favicon.ico)
    - Copyright (c) 2015-present Ionic (http://ionic.io/)
    - Licensed under [The MIT License](./LICENSE_icon)

> [!IMPORTANT]
>
> [`./agvw-like`](./agvw-like/) は DWANGO Co., Ltd. が [MIT License](https://github.com/akashic-games/agvw/blob/main/LICENSE) で公開している [`@akashic/agvw`](https://github.com/akashic-games/agvw) をリバースエンジニアリングにして作成したものです。
> 詳細は [`./agvw-like/README.md`](./agvw-like/README.md) を参照してください。

## Author

- yasshi2525 ([X](https://x.com/yasshi2525))
