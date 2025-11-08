# MCPサーバー / ツール設計書

## 1. サーバー構成
- Node 20 + Fastify。`/mcp`に対し`@modelcontextprotocol/sdk`の`StreamableHTTPServerTransport`を割り当て。
- `packages/shared`の型/Zodをインポートし、入出力を厳格にバリデーション。
- `FileNoteStore`はDIで受け取り、単体テストでモック可能にする。

## 2. ツール一覧
| ツールID | 目的 | 主な引数 | 主な返却 structuredContent |
| --- | --- | --- | --- |
| `notes.generateDraft` | 会話→Markdown下書き生成 | `conversationContext`, `tagHints` | `draftNote`（title/body/tags）|
| `notes.create` | 新規ノート保存 | `title`, `content`, `tags`, `sourceConversationId` | `noteDetail`, updated list |
| `notes.update` | 既存ノート更新 | `noteId`, `title`, `content`, `tags` | `noteDetail`, updated list |
| `notes.list` | ノート一覧取得 | `limit`, `offset`, `tagFilters?` | `noteList`（メタ+抜粋）|
| `notes.search` | タグ＋全文検索 | `tags`, `query`, `limit` | `searchResults`（ハイライト付き）|

## 3. structuredContent設計
- 共通: `{ "type": "noteList", "notes": [...], "meta": { ... } }` のように`type`でUIがレンダリングパスを決定。
- 詳細: `noteDetail`には本文、タグ、`actions`（編集/チャット質問）を含む。
- 検索: `searchResults`には`results`配列＋`cta`を含め、チャット回答で再利用。

## 4. レスポンス分割
- `content`: モデル用テキスト（例: 「ノートを保存しました。タグ: ...」）。
- `structuredContent`: UI同期データ。
- `_meta`: UI専用の大きなデータ（全文）やCSP設定、ペイジネーション情報。

## 5. セキュリティ
- `openai/widgetCSP`で `resource_domains`（CDN等）と`connect_domains`（API/Ngrok）を限定。
- `securitySchemes`に`noauth`（現状）と`oauth2`（将来）を記述。
- 書き込みツールは入力サイズ検証（タイトル/本文/タグ数）とエスケープ処理。

## 6. ロギング/モニタリング
- リクエストID（UUID）をヘッダに付与し、全ログに紐付け。
- ツールごとに成功/失敗カウンタ、レイテンシを集計。
- 重大エラー時には`content`にユーザー向けガイド、ログには詳細スタックを残す。

## 7. テスト戦略
- ユニット: FileNoteStoreモックでツールごとの入力検証を確認。
- コンポーネント: MCP Inspectorで手動検証＋Playwrightで`/mcp`モック呼び出し。
- ゴールデン: 代表プロンプトを`tests/prompts/*.json`に保存し、CIで再生。

## 8. 今後の拡張
- `notes.delete`, `notes.history`, `notes.share` などのツール追加余地。
- Agentic Commerce対応に備えた課金/制限ヘッダ（RateLimit）実装。
