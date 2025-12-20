# About

Akashic Engine の実行時情報を保管するサーバー実装です。

## NOTE

> [!NOTE]
>
> 現在は実行時情報をすべてオンメモリに保管します。将来的に一定期間経過した Tick/Event Data を Redis に保管させる予定です

- Memo
  - API doc の作成・デプロイ
  - APIアクセス制御（特にプレイ開始と終了）
    - akashic-server と共通の認証トークンを持っているかで判別する
