# 002: ドメインモデルと共通ユーティリティ定義

## 目的
- ノートメタデータ/本文/タグ情報を統一的に扱えるよう、共通型・Zodスキーマ・ユーティリティを`packages/shared`に整備する。

## スコープ
- Note, Tag, ConversationContextなどの型定義とZodスキーマ。
- Markdownテンプレ適用に必要なヘルパー関数。
- ChatGPT structuredContentとのシリアライズ/デシリアライズ補助。

## 完了条件
- `packages/shared` から `import { NoteSchema }` などを行うと型チェックが通り、サーバーとウィジェットの両方で再利用できる。
- サンプルノートデータを使った型テスト/Vitestが追加されている。
- structuredContentペイロードの型（例: `NotePreviewPayload`）が定義され、UI/サーバー双方で参照されている。

## 作業リスト
1. Noteメタデータ（id/title/tags/sourceConversationId/createdAt/updatedAt/contentPath）とAPIレスポンス用型を定義。
2. タグを正規化するヘルパー（小文字化、スペース→ハイフン等）と、最大タグ数/文字数のバリデーションを追加。
3. Markdown本文にヘッダー/タグ一覧/本文/付録（図リンク）を差し込む`renderNoteMarkdown`ユーティリティを実装。
4. structuredContentで共有するデータ構造（一覧・詳細・エディタ）を整理し、Zodでバリデーションできるようにする。
5. 代表的なコンテキストをfixturesとして保存し、sharedパッケージ内のテストでシリアライズ/デシリアライズの往復が成功することを確認。
