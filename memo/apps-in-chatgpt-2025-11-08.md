# Apps in ChatGPTメモ（調査日: 2025-11-08）

## 1. 概要
- 2025-10-06にOpenAIがChatGPT内で直接会話できる新世代の「Apps」とApps SDKプレビューを発表。ユーザーはチャットから離れずに地図やプレイリストなどのインタラクティブ要素を呼び出せる。
- Appsを通じてコンテキストに合わせた支援が受けられ、開発者はApps SDKでチャットロジックとUIを定義し、既存バックエンドと連携させて約8億人のChatGPTユーザーにリーチできる。

## 2. 提供状況
- 現在はEEA・スイス・英国以外の地域でログインしているChatGPTユーザーがFree/Go/Plus/Pro各プランで利用可能。EU圏にもまもなく展開予定。
- 初期パートナー（Booking.com, Canva, Coursera, Expedia, Figma, Spotify, Zillow）が英語で公開済み。追加の11社パートナーも年内予定。
- Business/Enterprise/Eduプラン向け提供も年内予定とされている。

## 3. 利用方法と体験
- メッセージの冒頭でアプリ名（例: "Spotify, ..."）を呼ぶ、または"/"入力やComposerのToolsメニューから選ぶと起動できる。
- 会話内容に応じてChatGPTが適切と思われるアプリを提案する。例: 住宅購入の話題でZillow、旅程でBooking.comなど。
- 初回利用時には接続確認と共有データの説明が表示される。

## 4. データ共有と安全性
- アプリはチャット文脈を利用して応答を最適化でき、MemoryがONの場合は保存済みメモリも参照してパーソナライズする。
- 有効化したアプリにはIP由来の概算位置・デバイス情報などWebアクセス時と同等の基本情報が共有される可能性がある。
- データ取り扱いは各アプリの利用規約・プライバシーポリシーに従う。Free/Go/Plus/Proユーザーで「Improve the model for everyone」をONにしている場合、アプリ経由データがモデル改良に用いられることがある。
- OpenAIは全アプリに対して使用ポリシー順守、全年齢適合、明確なプライバシーポリシー、データ最小化などを義務付け、より細かなデータ利用カテゴリー制御も提供予定。

## 5. Apps SDKと開発フロー
- Apps SDKはModel Context Protocol (MCP) を拡張したオープンソースの開発キットで、アプリのロジックとUIを定義し、任意の実行環境に展開できる。
- 現在はプレビュー段階のためDeveloper Modeで自作アプリを作成・テスト可能だが、他ユーザーへの配布はまだ行えない。
- 開発手順: 公式ドキュメントで設計指針を確認 → 独自コードでチャット体験とUIを実装し既存バックエンドへ接続 → Developer Modeでテスト → 公開前にドラフト開発者ガイドラインで安全性・プライバシー基準を確認。
- アプリディレクトリが年内に公開され、基準を満たしたアプリの投稿受付が開始予定。優れたアプリはディレクトリやチャット上でより目立つ形で紹介される。
- 収益化の詳細は今後案内され、ChatGPT内で即時決済を実現するAgentic Commerce Protocolへの対応が計画されている。

## 6. 今後の展望
- 今年後半に開発者からのアプリ投稿受付と審査を開始し、一般ユーザーが検索・閲覧できる専用ディレクトリを提供予定。
- EU展開、Business/Enterprise/Eduプラン対応、パートナー拡大、再利用可能コンポーネントや開発ツールの強化などがロードマップに含まれる。

## 7. Apps SDKで自作Appsを構築する詳細メモ（2025-11-08時点）

### 7.1 必要構成と全体フロー
- Apps SDKアプリは「iframeでレンダリングされるWebコンポーネント」と「MCPサーバー（/mcpエンドポイントでツールとリソースを公開）」の2階層で成り立つ。UIは任意のフレームワークで実装し、サーバー側でツール呼び出しとデータ供給を行う。
- 推奨フロー: ユースケース設計 → UIモック/コンポーネント設計 → MCPツール定義とスキーマ設計 → ローカルでUI+サーバー連携を確認 → https化（トンネル可）→ ChatGPT Developer ModeでConnector作成 → 会話内テスト → デプロイ/監視/審査準備。

### 7.2 UIコンポーネント実装の要点
- `public/xxx-widget.html` のような単一HTMLやReact/TSバンドルを用意し、`window.openai.toolOutput` を初期状態として描画。モデルからの最新structuredContentが注入されるので、描画関数は差分更新を意識する。
- `window.openai.callTool(name, payload)` でUIから直接MCPツールを呼び出し、戻り値のstructuredContentでUIを再同期する。チャットへの追加質問は `sendFollowUpMessage`、レイアウト切り替えは `requestDisplayMode`、外部リンクは `openExternal` を使用。
- `openai:set_globals` イベントを監視してテーマ/デバイス/セーフエリア変更に追従する。Reactの場合は `useSyncExternalStore` 等を使った `useOpenAiGlobal` ラッパーを置くとテストしやすい。
- `window.openai.setWidgetState`/`widgetState` でウィジェット単位のUI状態を保持できる。会話内で同じコンポーネントがフォローアップを受ける場合に、選択行やフォーム途中入力などを復元できる。

### 7.3 MCPサーバー設計
- 公式SDK（TypeScriptの `@modelcontextprotocol/sdk` またはPython SDK）を使い、`McpServer` に対してリソース（HTMLテンプレート）とツールを登録する。リソースは `mimeType: text/html+skybridge` かつ `_meta` で `openai/widgetPrefersBorder` や CSP、カスタムドメインを宣言可能。
- 各ツールに `openai/outputTemplate` を設定してUIテンプレートと紐づけ、必要に応じて `openai/toolInvocation/*` でステータス文や `openai/widgetAccessible` でコンポーネントからのツール起動可否を制御する。
- ツールレスポンスは `structuredContent`（UI/モデル双方へ渡す主要データ）、`content`（モデルに読ませるテキスト）、`_meta`（UI専用データ）を明示的に分離する。大きなデータは `_meta` に置いてモデルのトークン消費を抑える。
- `openai/widgetCSP` で `connect_domains`/`resource_domains` を指定し、外部APIやCDNをホワイトリストに登録。将来の審査でもCSPスナップショットが確認されるため早期に整備する。

### 7.4 ローカル開発と接続
- Node例: `npm install @modelcontextprotocol/sdk zod` → `public/` 配下のHTML/JSを用意 → `server.js` で `createServer` を立て `/mcp` へのPOST/GET/DELETEを `StreamableHTTPServerTransport` に渡す構成が推奨。Pythonの場合はFastAPI等で同等のエンドポイントを用意する。
- `npm run build` などでUIを再ビルドしたらサーバーを再起動し、`MCP Inspector`（ローカルで `http://localhost:<port>/mcp` を指定）でツール一覧やレスポンスを検証してからChatGPT接続に進む。
- ChatGPTから到達させるために `ngrok http <port>` や Cloudflare Tunnel を起動し、生成された `https://<subdomain>.ngrok.app/mcp` をConnector URLとして使う。

### 7.5 ChatGPT Developer Modeによる接続手順
- ChatGPTの「Settings → Apps & Connectors → Advanced settings」でDeveloper Modeを有効化すると「Create」ボタンが現れる。
- 「Settings → Connectors → Create」でコネクタ名・説明・公開URL（HTTPS + `/mcp`）を登録。成功するとツール一覧が表示されるので、失敗時はTestingガイドやMCP Inspectorでログを確認する。
- 新しいチャットで「+」ボタン→「More」からコネクタを追加し、アプリ名やユースケースに沿ったプロンプトでツール呼び出しを確認。`Settings → Connectors` から「Refresh」を押すとツールメタデータを再取得できる。
- 現状AppsはFree/Go/Plus/Proでのみ利用可能（Business/Enterprise/Eduは将来対応予定）。ただし開発者モード自体は上位プランでも起動できる。

### 7.6 デプロイと運用
- 本番ではTLS終端済みの安定したHTTPSを確保する。Fly.io/Render/Railway等のマネージドコンテナ、Cloud Run/Azure Container Apps等のサーバーレス、既存Kubernetesクラスタなどが推奨候補。ストリーミングHTTPがタイムアウトしないようコールドスタート時間を抑える。
- 環境変数としてAPIキー等のシークレットを注入し、ログにはツール呼び出しID・レイテンシ・エラー詳細を記録。CPU/メモリ/リクエスト数をモニタし、リリースごとにゴールデンプロンプトでリグレッションを確認する。
- 提供前にDeveloper Modeや内部実験フラグでアクセスを制限し、スクリーンショットや動画で再現手順を残すとレビュー準備が楽になる。

### 7.7 状態管理
- 状態は「ビジネスデータ（サーバーが唯一のソース）」「UIエフェメラル（ウィジェット内）」「クロスセッション（独自バックエンド）」に分類し、それぞれ適切な保管場所を徹底する。
- UI状態は `window.openai.setWidgetState` / `widgetState` でメッセージ単位に保存し、フォローアップでも復元できるようにする。ビジネスデータは必ずツール経由で更新し、最新スナップショットをstructuredContentで返してUIとモデルを再同期させる。
- 会話をまたいで共有したい設定は独自ストレージに保存し、必要ならOAuth経由でユーザーを識別してAPIリクエストを行う。

### 7.8 認証とセキュリティ
- 顧客データや書き込み操作を扱う場合はOAuth 2.1フローを実装する。`/.well-known/oauth-protected-resource` でリソースメタデータを公開し、Authorization Serverのディスカバリードキュメント（OpenID/OAuthメタデータ）を用意してPKCE(S256)対応を明示する。
- ChatGPTはDynamic Client Registrationで接続するため、Authorization ServerがDCRを許可する必要がある。発行されたアクセストークンはサーバー側で署名・audience・scope・有効期限を検証する。
- MCPツールの `securitySchemes` に `oauth2` や `noauth` を設定して、リンクが必要なツールを明示。トークン不足時は `_meta["mcp/www_authenticate"]` にWWW-Authenticate文字列を入れて再認証を促す。
- ネットワーク的にはChatGPTの公開IP帯を許可リスト化し、`openai/widgetCSP` で外部通信先を絞ることでコンポーネントの安全性を高める。

### 7.9 公開準備とエコシステム
- 2025年11月時点ではApps SDKはプレビューで、Developer Mode内で自作アプリをテストできるが他ユーザーへの配信は未解禁。年内にアプリディレクトリと投稿受付が始まり、審査ではドラフトのDeveloper GuidelinesやDesign Guidelinesへの準拠が求められる。
- App Developer Guidelinesでは「全年齢向け」「正確で信頼できる体験」「明確なメタデータ」「責任あるサポート体制」などが最低基準。高品質なUXやポリシー順守でディレクトリ上の露出が優遇される。
- Agentic Commerce Protocol対応や収益化詳細は今後案内予定のため、決済やサブスクを検討する場合は追加発表を待ちつつ、既存のバックエンドと連携できるよう設計しておくと移行が容易。

### 7.10 TypeScript+React採用時の推奨アーキテクチャ
- **モノレポ構成**: ルートに`packages/widget`（React 18+Vite/Nextを想定）、`packages/mcp-server`（Node 20+Express or Fastify+`@modelcontextprotocol/sdk`）、共通型定義`packages/shared`（Zodスキーマ、APIクライアント）を配置。`turbo`や`nx`でビルドキャッシュを共有し、`pnpm`ワークスペースで依存を管理する。
- **データフロー**: React側は`window.openai.toolOutput`を`useSyncExternalStore`ベースの`useToolOutput`フックで購読し、`structuredContent`をUI stateのソース・オブ・トゥルースに据える。ユーザー操作は`window.openai.callTool`経由でMCPツールを呼び出し、結果が戻ったらグローバルストアを書き換える。モデルに不要なデータはサーバーから`_meta`に分離。
- **状態管理境界**: ビジネスデータは常にMCPサーバー/既存APIが管理し、ReactはエフェメラルなUI状態（選択行、展開状態など）を`useState`+`window.openai.setWidgetState`で保持。設定プリセットなどのクロスセッション状態はサーバー側に保存し、必要時のみstructuredContentに含める。
- **UIレイヤー**: `packages/widget`ではAtomic Designに沿って`components/`、`hooks/`、`providers/`を分離。`OpenAiBridgeProvider`で`callTool`・`sendFollowUpMessage`・`requestDisplayMode`などをContext化し、`WidgetShell`がテーマ/セーフエリアのSetGlobalsイベントを購読してCSSカスタムプロパティを更新する。
- **MCPサーバーレイヤー**: `packages/mcp-server/src/index.ts`で`McpServer`インスタンスを生成し、`/mcp`エンドポイントをStreamable HTTPで公開。ツールはZodスキーマで定義し、レスポンスの`structuredContent`にUI必要データ、`content`にモデル向け要約、`_meta`にページングトークンなどを配置。HTMLコンポーネントは`resources/`から配信し、`_meta.openai/outputTemplate`でツールと結びつける。
- **開発&デプロイ**: ローカルは`pnpm dev`でViteサーバー+Expressを同時起動し、`ngrok http 3000`で外部公開したURLをChatGPT Connectorに設定。デプロイはFly.ioやCloud Runで`widget`を静的配信（Cloud Storage+CDN）、`mcp-server`をNodeサービスとして分離し、同一ドメイン配下でCSPを宣言する。
- **品質保証**: `packages/widget`にPlaywrightでiframe内E2Eテストを用意し、`packages/mcp-server`はVitestでツールロジックをモックしながら検証。ゴールデンプロンプトを`tests/prompts/`に保管し、CIでConnector呼び出しをエミュレートしてstructuredContentの互換性を継続的にチェックする。
