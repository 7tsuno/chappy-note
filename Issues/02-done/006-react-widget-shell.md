# 006: Reactウィジェットシェル実装

## 目的
- Apps内で動くReactウィジェットの土台を整え、OpenAIウィジェットブリッジとのイベント連携・テーマ対応・レイアウトを実現する。

## スコープ
- `packages/widget` にエントリポイント、Router的な状態管理（一覧/詳細/エディタビュー切り替え）。
- `OpenAiBridgeProvider`（`window.openai`ラッパー）と `useToolOutput` フックの実装。
- グローバルテーマ/セーフエリアに追従するスタイル調整。
- Storybook上でブリッジをモック化し、シェル状態（ローディング/エラー/通常）をレビュー可能にする。

## 前提Issue
- 001: モノレポ基盤構築
- 002: ドメインモデルと共通ユーティリティ定義

## 完了条件
- Vite開発サーバーでウィジェットがローカル表示でき、`window.openai`モックでも画面が動作する。
- `structuredContent` を受け取ってビューを切り替える最小限のstate machineが動作する。
- `callTool` や `sendFollowUpMessage` をProvider経由で呼べるようになっている。
- Storybookでシェル関連Story（例: 初期状態/エラー）が表示され、レビュー依頼ができる。

## 作業リスト
1. React 18 + TypeScript構成でエントリ/components/hooksディレクトリを作成。
2. `window.openai` が未定義のローカル環境向けにモック実装を用意し、ホットリロード確認を容易にする。
3. `OpenAiBridgeProvider` を実装し、`toolOutput`/`setWidgetState`/`requestDisplayMode`/`openExternal` をContextから参照可能にする。
4. `useStructuredContentState`（仮）を作り、最新structuredContentをグローバルストアに反映する。
5. ベースレイアウト（ヘッダー、メイン、フッタ）とSkeleton/エラー表示を整備。
6. CSS-in-JS or PostCSSなどスタイリング方式を決定し、OpenAIテーマ変化イベントでCSS変数を更新する仕組みを実装。
7. Storybook設定/デコレータを追加し、主要状態のStoryを登録してユーザーレビュー手順を共有。
