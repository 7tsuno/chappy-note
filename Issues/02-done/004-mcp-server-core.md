# 004: MCPサーバーコアとツール定義

## 目的
- Apps SDKが利用するMCPサーバーを実装し、ノート保存/閲覧/検索のツールを公開してChatGPTから操作できるようにする。

## スコープ
- Fastify/Expressサーバー上に`/mcp`エンドポイントを開設し、`@modelcontextprotocol/sdk`でツール登録。
- 以下のツール実装: `notes.list`, `notes.create`, `notes.update`, `notes.search`, `notes.generateDraft`（チャット文脈→Markdown下書き）。
- structuredContentとUIテンプレ（HTMLリソース）を結びつけるメタ定義。

## 前提Issue
- 001: モノレポ基盤構築
- 002: ドメインモデルと共通ユーティリティ定義
- 003: ファイルストア層の実装

## 完了条件
- MCP Inspectorで上記ツールが列挙され、呼び出し→レスポンスが成功する。
- 各ツールがファイルストア層（Issue003）とshared型（Issue002）を利用して動作する。
- `openai/outputTemplate` や `openai/widgetCSP` などApps SDK必須メタが設定済み。

## 作業リスト
1. Fastify/ExpressでHTTPサーバーを用意し、`StreamableHTTPServerTransport`で`/mcp`を公開。
2. `notes.list`/`notes.search`は構造化ペイロードを返し、UIがタグ/日時でソートできるよう必要データを含める。
3. `notes.create`/`notes.update`はFileNoteStoreを呼び出し、成功時に最新メタデータを返却。
4. `notes.generateDraft`ツールを追加し、ChatGPTから提供された会話メモをMarkdownテンプレに落とし込む（OpenAIモデル呼び出しはApps側で行う想定）。
5. HTMLテンプレート（Reactウィジェットのビルド成果物）を `resources/` から提供し、`_meta.openai/widgetPrefersBorder` 等を設定。
6. ツール呼び出し時のエラーハンドリング/ログ出力/レスポンス整形（content vs structuredContent vs _meta）を実装。
