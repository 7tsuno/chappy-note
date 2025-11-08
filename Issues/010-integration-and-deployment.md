# 010: 統合テストとデプロイ準備

## 目的
- ウィジェットとMCPサーバーを結合し、ngrok経由でChatGPT Developer Modeに接続できる状態まで仕上げる。E2Eテストや運用手順を整備し、MVP完成とする。

## スコープ
- ngrok/Cloudflare Tunnelなどのトンネル設定とSecrets管理。
- ChatGPT Developer ModeでのConnector登録手順ドキュメント化。
- E2Eテスト（Playwright等）とゴールデンプロンプト検証。

## 完了条件
- `pnpm dev:mcp` + `pnpm dev:widget` 実行後、ngrok URLをConnectorに設定して保存→閲覧→検索のフローがチャット内で確認できる。
- Playwright（または相当）でノート作成〜編集〜検索のUIフローを自動化したテストが追加されている。
- `docs/deployment.md` 等にトンネル起動手順、Connector更新手順、E2Eチェックリストが記載されている。

## 作業リスト
1. ngrok設定ファイルを用意し、HTTPS必須・BasicAuth設定など最低限のセキュリティを確保。
2. `pnpm dev`系スクリプトを整備し、ウィジェット/サーバーの同時起動を簡単にする。
3. ChatGPT Developer ModeでConnectorを作成し、接続確認ログやトラブルシューティングを記録。
4. Playwrightでウィジェットの主要フロー（ノート作成→編集→検索→参照）を自動化テスト化。
5. READMEまたは専用ドキュメントにデプロイ/E2E手順と既知の制約をまとめ、MVP完了条件を明文化。
