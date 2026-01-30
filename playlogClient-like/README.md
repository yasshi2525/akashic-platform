# About

[`@akashic/agvw`](https://github.com/akashic-games/agvw) の実行時に必要となる `playlogClinet` (ソース非公開) の独自実装です。

## NOTE

### バンドル形式について

ディストリビューションファイルには `socket.io-client` もバンドルされています。
これは本ライブラリ利用するクライアント側で別途モジュール解決させることができなかったための措置です。

### 機能制限

#### 未対応: `usePrimaryChannel` による制御

`usePrimaryChannel` に対応する機能は未実装です。 `usePrimaryChannel = false` のとき何を使い回すのか仕様が分かっていないためです。本実装では `createClient` の際、新規に作るのは Socket ではなく、 AMFlowClient です。

### 独自機能

#### プレイ終了通知

サーバーからのプレイ終了通知リスナを追加できます。詳細は [`AMFlowClient.onPlayEnd()`](./src/AMFlowClient.ts) を参照してください。

#### プレイ時間延長通知

プレイ時間延長通知リスナを追加できます。詳細は [`AMFlowClient.onPlayExtend()`](./src/AMFlowClient.ts) を参照してください。
