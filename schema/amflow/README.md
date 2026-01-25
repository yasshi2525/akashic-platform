# About

[`@akashic/amflow`](https://github.com/akashic-games/amflow) のメッセージを [Socket.IO](https://socket.io/) を使ってサーバー・クライアント間で送受信するためのスキーマ定義です。

## NOTE

イベント名は [`@akashic/agvw`](https://github.com/akashic-games/agvw) で使用されている値に合わせています。

### `sendTick` の省リソース化

毎 tick 実行される `sendTick` について、通信回数を減らせるようまとめて送信する機能を提供しています。 ([`TickPack`](./common/src/tick.ts) 参照)

ただし、数フレームの遅れでもクライアントの操作性に大きな影響がでたため、実行環境によってはまとめて送信しない方がよい可能性があります。

### 独自イベント `playEnd`

本アプリケーションでは、プレイヤー操作やコンテンツ削除でPlayが強制的に終了する場合があります。
強制終了したこと、およびその理由をクライアントに通知できるようにするため、独自イベントを定義しています。

> [!IMPORTANT]
>
> ここでは「クライアント」はゲームインスタンスを指しています。
> つまりサーバー上で実行されるアクティブインスタンスもクライアントである点に注意してください。

> [!WARNING]
>
> 利用されていない `putStorageData`, `getStorageData` は定義対象外です

### 独自イベント `playExtend`

プレイ時間の延長が発生したことを、全クライアントへ通知するためのイベントです。
サーバー側で `expiresAt`, `remainingMs`, `extendMs` を含むペイロードを配信します。
