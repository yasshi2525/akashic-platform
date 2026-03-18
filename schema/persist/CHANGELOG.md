# CHANGELOG

## 1.3.0

- Feature
  - `Play` にログ管理用フィールドを追加
    - `isActive`: プレイ中かどうか（終了時に `false` に更新）
    - `endedAt`: プレイ終了日時
    - `logUploadedAt`: S3 へのログアップロード完了日時
    - `crashed`: 異常終了フラグ
    - `errorLogged`: エラーログ出力フラグ

## 1.2.0

- Feature
  - クラッシュレポート通知用フィールド追加

## 1.1.0

- Feature
  - `Play` に限定部屋機能用フィールドを追加

## 1.0.2

- Bug Fix
  - `User`.`email` を Optional に

## 1.0.1

- Misc
  - `*.pem` がある場合、コンテナに含めるように

## 1.0.0

公開
