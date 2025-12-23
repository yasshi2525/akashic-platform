# About

[`@akashic/agvw`](https://github.com/akashic-games/agvw) の実行時に必要となる `playlogClinet` (ソース非公開) の独自実装です。

## NOTE

ディストリビューションファイルには `socket.io-client` もバンドルされています。
これは本ライブラリ利用するクライアント側で別途モジュール解決させることができなかったための措置です。

> [!NOTE]
>
> `usePrimaryChannel` に対応する機能は未実装です。 `usePrimaryChannel = false` のとき何を使い回すのか仕様が分かっていないためです。本実装では `createClient` の際、新規に作るのは Socket ではなく、 AMFlowClient です。
