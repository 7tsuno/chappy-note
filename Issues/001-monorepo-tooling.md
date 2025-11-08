# 001: モノレポ基盤構築

## 目的
- Apps SDK向けのReactウィジェットとMCPサーバーを同一ワークスペースで開発できるよう、pnpmモノレポとビルド/品質ツールを整える。

## スコープ
- `pnpm-workspace.yaml` と `package.json` のルート設定。
- `packages/widget`、`packages/mcp-server`、`packages/shared` の雛形作成。
- TypeScript 5系、ESLint、Prettier、Vitest/Turboなどの共通設定。

## 完了条件
- `pnpm install` 後にすべてのパッケージで型チェックとLintが通る。
- `turbo run build`（または同等コマンド）でウィジェットとサーバーのビルドが成功する。
- READMEにセットアップ手順（pnpm要件、Nodeバージョンなど）が追記されている。

## 作業リスト
1. Node 20系を前提に `.nvmrc` / `engines` を設定し、pnpmをワークスペースモードで有効化。
2. ルートに `tsconfig.base.json`、ESLint設定、Prettier設定を配置し、パッケージから参照できるようにする。
3. `packages/shared` に空の `src/index.ts` とテスト環境を用意し、他パッケージが依存できるよう`package.json`を整備。
4. `packages/widget` にVite + React 18 + TypeScript雛形を生成し、Apps SDKビルドターゲット（iframe向け）を意識した`build`スクリプトを定義。
5. `packages/mcp-server` にExpress/Fastifyベースのサーバー雛形を作成し、`@modelcontextprotocol/sdk` を依存に追加。
6. Turbo（またはnpm scripts）で `build`/`lint`/`test` パイプラインを定義し、CI想定の`pnpm run ci`コマンドを整える。
