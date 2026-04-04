# CHANGELOG

## 1.4.7

- Improve
  - `webapp`
    - スマートフォンでゲーム画面が画面内に収まるよう修正 (#12)

## 1.4.6

- Fix
  - `akashic-storage`
    - broadcast する Tick の順序が subscribe 順と一致しない場合がある問題を修正 (#57)

## 1.4.5

- Fix
  - `./webapp`
    - スマートフォンで X のシェアボタンが機能しないボタンを修正 (#11)
    - プレイヤーによるログ送信時、捕捉した例外の詳細情報が展開されない問題を修正

## 1.4.4

- Improve
  - `./webapp`
    - ゲーム一覧から部屋を作成しやすく動線を改善 (#9)
    - ゲーム説明欄中のURLはリンクとして表示するよう改善 (#17)

## 1.4.3

- Improve
  - `./webapp`
    - プレイヤーによるログ送信時、 `console.error` または `Error` が報告された場合、スタックトレースを含めるよう修正
  - `./akashic-server`
    - `console.error` 出力の場合、スタックトレースを追加出力するよう修正

## 1.4.2

- Feature
  - プレイヤーが自身のプレイ中ログをゲーム投稿主に報告できる機能を追加
    - `./akashic-server`
      - プレイ終了時、投稿主に通知する機能を追加
    - `./webapp`
      - ログ送信・表示機能を追加
    - `./schema/persist`
      - プレイヤーからのログ送信履歴を記録するテーブルを追加

## 1.4.1

- Feature
  - 投稿ゲームの部屋のログをダウンロードする機能を追加
    - `./akashic-server`
      - ログのアップロード機能を追加
    - `./webapp`
      - ログのダウンロード画面を追加
  - 投稿ゲームの異常終了時・エラーログ出力時、通知する機能を追加
    - `./schema/persist`
      - エラーの有無を記録するフィールドを追加

## 1.4.0

- Feature
  - `./akashic-server`
    - ユーザー投稿ゲームのログに PlayID, ContentID を埋め込む機能を追加

## 1.3.5

- Feature
  - 入室にキーワード入力を求める限定部屋機能を追加
    - `./webapp`
      - 限定部屋入室機能を追加
    - `./akashic-server`
      - 限定部屋を作成する機能を追加
    - `./schema/persist`
      - 限定部屋機能用フィールド追加

## 1.3.4

- Improve
  - `./akashic-storage`
    - Valkey Server への再接続設定により接続安定性を向上

## 1.3.3

- Misc
  - `./webapp`
    - 実況可否の表記を分かりやすく改善 (#29)

## 1.3.2

- Fix
  - `./akashic-storage`
    - Event 書き込み遅延により、イベントがないものとして応答してしまう問題を修正

## 1.3.1

- Fix
  - `./akashic-storage`
    - Event 情報が異なるノードに振り分けられてしまう問題を修正 (#34)

## 1.3.0

- Feature
  - `./webapp`
    - ゲスト状態の場合同時に作成できる部屋数に上限を設定できるよう修正

- Improve
  - `./webapp`
    - ゲスト状態の場合は部屋一覧でなく参加方法をガイドするよう修正

## 1.2.4

- Improve
  - `./akashic-storage`
    - 部屋を削除するとき、 Valkey Server へ負荷やブロックをかけないクエリに変更
    - `GlideClusterClientConfiguration.requestTimeout` を変更できるように修正

## 1.2.3

- Bug Fix
  - `./akashic-storage`
    - 同一tickに複数のEventがある場合、TickListの取得結果に欠損が生じる問題を修正
  - `./agvw-like`
    - AMFlowProxy 作成時、イベントハンドラが登録されない問題を修正

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
