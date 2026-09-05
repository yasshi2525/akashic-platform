# CHANGELOG

## 2.0.0

- Breaking Change
  - `amf:getTickList` / `amf:getStartPoint` の応答を分割転送方式に変更
    - 応答の ack ではヘッダ (`TickListTransferHeader` / `StartPointTransferHeader`) のみを返し、
      実データは `amf:[c]` (`TransferChunk`) として後続で送る
    - 転送中断用に `amf:cancelTransfer` を追加
    - `sliceTransferData` を追加 (サロゲートペアを壊さない文字列分割)

## 1.1.0

- Feature
  - `Carrier` を追加 (トレーサビリティ強化のため)

## 1.0.1

- Misc
  - Update dependencies.

## 1.0.0

公開
