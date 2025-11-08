# 011: Storybook整備とUIレビュー導線

## 目的
- Reactウィジェットの各画面（一覧/詳細/エディタなど）をStorybook上で切り離して表示し、デザイン・挙動をレビューしやすくする。

## スコープ
- `packages/widget` にStorybookを導入し、OpenAIウィジェット固有のブリッジをモック化。
- コンポーネントごとのStory作成（一覧カード、タグフィルタ、NoteEditorなど）。
- CIまたはローカルでStorybookビルドが通る状態を整備し、レビュー手順をドキュメント化。

## 完了条件
- `pnpm storybook` でローカル起動、`pnpm build:storybook` で静的ビルドが成功する。
- 主要な画面状態（新規保存、既存ノート閲覧、検索結果無しなど）がStoryとして登録されている。
- READMEまたは`docs/ui-review.md`に「Storybook起動→レビュー→フィードバック共有」の手順が記載されている。

## 作業リスト
1. Storybook 8系（React/Vite構成）を導入し、`OpenAiBridge` をモックするDecoratorを実装。
2. `NoteList`, `NoteDetail`, `NoteEditor`, `TagFilter`, `EmptyState` など主要コンポーネントのStoryを作成。
3. Figma等のデザインソースが無い場合は、ワイヤーフレームレベルのUIをStory上で構築しレビュー依頼できるようにする。
4. `pnpm storybook` をウィジェットパッケージのscriptsに追加し、CIで`build:storybook`を実行。
5. `Issues/006-008` にStorybookレビューをマイルストーンとして明記し、各画面実装時にStoryを更新する運用を整える。
