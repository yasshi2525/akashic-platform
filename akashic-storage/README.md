# About

Akashic Engine の実行時情報を保管するサーバー実装です。

## Requirement

- Redis データベース

## NOTE

> [!NOTE]
>
> API docの作成は現状、そこまでAPIが複雑でないのと、下記の調査が必要のため保留している。
>
> - コードのどこにOpen API 準拠の仕様を定義するか
> - GitHub Pages で公開する際、Swagger UIのビルド成果物は使用できるか

- Memo
  - API doc の作成・デプロイ
  - APIアクセス制御（特にプレイ開始と終了）
    - akashic-server と共通の認証トークンを持っているかで判別する
