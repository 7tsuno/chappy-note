# アーキテクチャ設計書

## 1. システム構成概要
```
ChatGPT会話
   │
   │Apps呼び出し (Apps SDK)
   ▼
Reactウィジェット (iframe)
   │  window.openai.*
   ▼
MCPサーバー (Fastify + @modelcontextprotocol/sdk)
   │
   ├─ FileNoteStore (data/notes, notes.index.json)
   └─ Tag/Searchサービス (テキスト検索, ハイライト)
```

## 2. コンポーネント
| コンポーネント | 役割 | 技術 |
| --- | --- | --- |
| Reactウィジェット | ノート一覧/詳細/エディタUI、Storybookレビュー対象 | React 18, Vite, Zustand or Context, CSS variables |
| OpenAiBridgeProvider | `window.openai`ラッパー、structuredContent/state同期 | カスタムフック (`useToolOutput`, `useOpenAiGlobals`) |
| MCPサーバー | ツール公開、ノートCRUD/Search、構造化レスポンス整形 | Node 20, Fastify, `@modelcontextprotocol/sdk` |
| FileNoteStore | Markdown + メタデータ管理、アトミックI/O | Node fs/promises, uuid, Zod |
| Tagging/Search | タグ正規化、自動提案、全文検索 | natural, minisearch など検討中 |

## 3. データフロー
### 3.1 ノート保存
1. ユーザーが「保存して」と依頼→Appsが`notes.generateDraft`を呼び、Draft structuredContentをUIへ送信。
2. `NoteEditor`で編集→`callTool('notes.create')`→MCPサーバーがFileNoteStoreへ書き込み。
3. 保存結果structuredContentで一覧/詳細に反映し、チャットにもテキスト完了メッセージ。

### 3.2 編集
1. 一覧/詳細で「編集」→同エディタに切替→`notes.update`呼び出し。
2. 更新結果は`updatedAt`を更新し、structuredContentでUI/チャットへ同期。

### 3.3 検索
1. チャット質問 or UI検索で`notes.search`呼出。
2. サーバーがタグフィルタ→全文検索を実行し、スコア順に結果をstructuredContentカード化。
3. チャットには上位要約文を返し、UIには一覧表示＋CTA。

## 4. 技術スタック
- **フロント**: React 18, Vite, TypeScript, Storybook 8, Playwright（E2E）。
- **サーバー**: Node 20, Fastify/Express, `@modelcontextprotocol/sdk`, Zod, uuid, fs-extra。
- **検索**: minisearch or flexsearch（MVPは同期的全文検索でも可）。
- **ツールチェーン**: pnpm, Turbo, ESLint, Prettier, Vitest。

## 5. 配置・デプロイ
- ローカル開発: `pnpm dev:widget` + `pnpm dev:mcp` + `ngrok http <port>`。
- デプロイ候補: Fly.io/Render/Cloud RunでMCPサーバー、静的ホスティング（Cloud Storage+CDN）でウィジェットを配信。
- Secrets: `.env`でngrok token等を管理、`direnv`や`doppler`採用検討。

## 6. セキュリティ・権限
- NgrokにBasic Auth設定し、Apps接続URLを限定公開。
- MCPツールは必要最小限のデータのみ返す（structuredContentと_metaを分離）。
- 将来のOAuth導入を想定し、`securitySchemes`にプレースホルダを用意。

## 7. 可観測性
- MCPサーバー: Winston/Pinoでツール呼び出しID、レイテンシ、検索ヒット数をログ。
- ウィジェット: consoleログをStorybookで抑止しつつ、Sentry等の導入余地を残す。
- E2E: ゴールデンプロンプトをCIで実行し、structuredContentスキーマ差分を検出。
