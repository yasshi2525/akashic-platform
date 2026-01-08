# About

[`@akashic/amflow`](https://github.com/akashic-games/amflow) のメッセージを [Socket.IO](https://socket.io/) を使ってサーバー・クライアント間で送受信するためのスキーマ定義です。

## NOTE

イベント名は [`@akashic/agvw`](https://github.com/akashic-games/agvw) で使用されている値に合わせています。

### `sendTick` の省リソース化

毎 tick 実行される `sendTick` について、通信回数を減らせるようまとめて送信する機能を提供しています。 ([`TickPack`](./common/src/tick.ts) 参照)

ただし、数フレームの遅れでもクライアントの操作性に大きな影響がでたため、実行環境によってはまとめて送信しない方がよい可能性があります。

> [!IMPORTANT]
>
> ここでは「クライアント」はゲームインスタンスを指しています。
> つまりサーバー上で実行されるアクティブインスタンスもクライアントである点に注意してください。

> [!WARNING]
>
> 利用されていない `putStorageData`, `getStorageData` は定義対象外です

> [!NOTE]
>
> ゲームの強制終了を通知できるようにする。終了理由は
>
> - 部屋を作った人が終了させた
> - プレイ中のゲームが削除された
> - サーバーが終了する
