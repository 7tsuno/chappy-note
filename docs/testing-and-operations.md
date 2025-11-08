# テスト・運用計画メモ

## 1. テスト戦略
- **ユニット**: sharedユーティリティ、FileNoteStore、タグ正規化、検索ロジック。Vitestでfsモックと実ファイルの両方を検証。
- **コンポーネント**: React Testing Libraryで主要コンポーネントのレンダリング/状態遷移を確認。
- **Storybookレビュー**: UI差分を手動確認し、Chromatic等によるビジュアル回帰も検討。
- **E2E**: Playwrightでノート作成→編集→検索→チャット応答を自動化。
- **Apps E2E**: Developer Mode + ngrok環境でのゴールデンプロンプト再生。

## 2. 運用フロー
1. `pnpm dev`でウィジェット/サーバーを起動。
2. `ngrok http 4000 --basic-auth=user:pass` で公開URL生成。
3. ChatGPT Settings → Apps & Connectors でConnectorを更新。
4. StorybookでUIを確認し、フィードバックをIssue化。
5. Playwright + ゴールデンプロンプトで回帰チェック後にマージ。

## 3. ログ/監視
- MCPサーバー: Pino + pino-pretty。`logs/`に開発ログを保存。
- 失敗時はログをIssueに添付し、再現手順を`docs/known-issues.md`に追記予定。

## 4. リリース手順（MVP）
1. mainブランチにマージ。
2. `pnpm build` でウィジェット/サーバー成果物を生成。
3. Fly.io等へデプロイ（将来）。MVP段階ではローカル常駐。
4. Connector URL更新＆Smokeテスト。

## 5. 将来の運用課題
- DB移行時のマイグレーション手順化。
- Secrets管理（Vault, Doppler）と監査ログ。
- SLAと通知チャネル（OpsGenie, Slack）設定。
