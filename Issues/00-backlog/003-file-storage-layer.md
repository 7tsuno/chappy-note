# 003: ファイルストア層の実装

## 目的
- MVPではローカルファイルをDB代替とするため、Markdown本文とノートメタJSONを信頼性高く読み書きするストレージ層を用意する。

## スコープ
- `data/notes/` ディレクトリ管理、`notes.index.json` の読み書き。
- アトミック書き込み、一時ファイル運用、ID発行、タイムスタンプ管理。
- 将来のDB移行を見据えた抽象インターフェース。

## 前提Issue
- 001: モノレポ基盤構築
- 002: ドメインモデルと共通ユーティリティ定義

## 完了条件
- `FileNoteStore`（仮称）を通じて `createNote/updateNote/listNotes/getNote/searchNotes` が利用できる。
- 書き込み時にテンポラリ→renameが行われ、部分書き込みリスクがない。
- E2Eユニットテストで複数ノート作成/更新/検索が期待通り動作する。

## 作業リスト
1. `data/notes` ディレクトリと `figures/` サブディレクトリの初期化処理を実装（存在しなければ作成）。
2. `notes.index.json` にノートメタを保存するリポジトリを作り、読み込み時にはZodで検証。
3. UUID生成＋ISO8601タイムスタンプ付与のユーティリティを追加し、`createdAt/updatedAt`を自動設定。
4. Markdown書き込みは `noteId.md.tmp` → `noteId.md` のrenameでアトミック化し、エラー発生時にはテンポラリを削除。
5. 簡易全文検索として `ripgrep` 相当のJS実装（例: `node-rg` or `fast-glob`+`readFile`）を導入し、`searchNotes` APIで本文ヒットを返す。
6. Vitestでストア層のCRUD/検索のテストを作成し、CIで実行。
