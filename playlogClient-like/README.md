# About

[`@akashic/agvw`](https://github.com/akashic-games/agvw) の実行時に必要となる `playlogClinet` (ソース非公開) の独自実装です。

## NOTE

ディストリビューションファイルには `socket.io-client` もバンドルされています。
これは本ライブラリ利用するクライアント側で別途モジュール解決させることができなかったための措置です。

> [!NOTE]
>
> `usePrimaryChannel` に対応する機能は未実装です。 `usePrimaryChannel = false` のときのみ新規 `Socket` を作る実装が必要です
