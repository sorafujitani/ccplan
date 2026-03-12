# ccplan

Claude Code の `.claude/plans/*.md` を管理する CLI ツール。

## コマンド

```
build            esbuild src/index.ts → dist/index.js (ESM)
build:bin        bun build --compile → ./ccplan (単体バイナリ)
test             vitest run
test:watch       vitest
test:cov         vitest run --coverage
lint             oxlint src tests
format           oxfmt src tests
typecheck        tsgo --noEmit
```

## アーキテクチャ

```
src/
  index.ts              エントリポイント
  cli/args.ts           node:util parseArgs ラッパー
  cli/router.ts         サブコマンドルーティング
  commands/             list, status, clean, open
  core/plan.ts          プランファイルの読み込み・解決
  core/config.ts        git root → .claude/plans ディレクトリ解決
  core/frontmatter.ts   ステータス定義 (draft | active | done)
  core/metastore.ts     .ccplan-meta.json の読み書き (valibot)
  utils/                fs, format, prompt ヘルパー
tests/
  commands/             コマンド単体テスト
  core/                 コアロジックテスト
  pbt/                  fast-check によるプロパティベーステスト
  utils/                ユーティリティテスト
```

## 規約

- ESM (`"type": "module"`)、インポートは `.js` 拡張子付き
- strict TypeScript、`tsgo` (TypeScript Go 版) で型チェック
- バリデーションは valibot
- テストは vitest (globals: true)、`tests/` 配下に配置
- PBT テストは `tests/pbt/` に `*.prop.test.ts` として配置
- メタデータは `.claude/plans/.ccplan-meta.json` に保存
