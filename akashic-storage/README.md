# About

Akashic Engine の実行時情報を保管するサーバー実装です。

## Requirement

- Redis データベース

## NOTE

- Memo
  - API doc の作成・デプロイ
  - APIアクセス制御（特にプレイ開始と終了）
    - akashic-server と共通の認証トークンを持っているかで判別する

> [!CAUTION]
>
> PlaylogのEventの扱い方が現状下記のように誤っていて、Playlogの仕様に従っていません。
> 現状: Passive/Active → sendEvent → そのまま全プレイヤーに broadcast
> 仕様: Passive/Active → sendEvent → Activeのみ受信 → Active側でTickを生成し sendTick （Tickの中に順序立てられたEventが格納されている）→ Tickを全プレイヤーにbroadcast
>
> 現状、なにをサブスクライブするかクライアントからサーバーに伝える処理がないので playlogClient-like の改修が必要。ただ、パッシブインスタンスの場合、どこで onTickが呼ばれるのか分からないが、呼ばれる前提で組んでみる。

> [!NOTE]
>
> Socket.io での送信効率が現状悪い。
> Eventなし時の Tick は number でやりとりすべきとあるが、それに従っていない。
> Event, Tick の度に broadcast している。ある程度まとめた方がネットトラフィックのオーバーヘッドが少ない

> [!NOTE]
>
> 現状、サーバー稼働中にプレイが完結する前提で実装している。ただし、サーバー正常停止を考慮して、resume機能はあった方がよい。ただし、ゲームインスタンス側も対応させないといけないため (特にアクティブインスタンスは途中から再開できるのか不明) 、当分は考慮しない
