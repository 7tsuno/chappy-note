# chappy-note

Apps SDK向けの勉強ノートApps開発リポジトリ。ReactウィジェットとMCPサーバーをpnpmモノレポで管理します。

## 前提
- Node.js 20.17.0 ( `.nvmrc` 参照 )
- pnpm 9.11.0 以降

## セットアップ
```bash
pnpm install
```

## よく使うコマンド
| コマンド | 説明 |
| --- | --- |
| `pnpm --filter @chappy/widget dev` | ウィジェットをViteで起動 |
| `pnpm --filter @chappy/widget storybook` | Widget Storybookをhttp://localhost:6006で起動 |
| `pnpm --filter @chappy/mcp-server dev` | MCPサーバーを開発モードで起動 |
| `pnpm build` | Turbo経由で全パッケージをビルド |
| `pnpm lint` | ESLint (flat config) を実行 |
| `pnpm test` | 各パッケージのVitestを実行 |
| `pnpm format` | Prettierチェック |

## プロジェクト構成
```
packages/
  shared/        共通型・ユーティリティ
  widget/        Apps SDK向けReact UI
  mcp-server/    MCPツール提供サーバー
Issues/          タスク管理 (レーン別)
docs/            設計情報
memo/            調査ノート
```

## 次のステップ
- Issue 002以降でドメインモデル、ファイルストア、MCPツール、UI、Storybook等を実装。
- `Issues/README.md` を参照してレーンを更新しながら進行します。
