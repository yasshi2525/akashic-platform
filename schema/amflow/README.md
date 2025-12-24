# About

[`@akashic/amflow`](https://github.com/akashic-games/amflow) のメッセージを [Socket.IO](https://socket.io/) を使ってサーバー・クライアント間で送受信するためのスキーマ定義です。

## NOTE

イベント名は [`@akashic/agvw`](https://github.com/akashic-games/agvw) で使用されている値に合わせています。

ただし、 `sendTick` については通信回数を減らすためにまとめて送信できるようにしています。 ([`TickPack`](./common/src/tick.ts) 参照)

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
