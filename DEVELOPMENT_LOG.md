# S0 / S1 開発記録

実施日: 2026-11-03（Asia/Tokyo）。参照資料は Downloads の `resumeflow_tdd_v0.2` にある4文書です。元の資料は変更せず、開発プロジェクトにコピーしました。

## 今回の判断と実装範囲

ユーザーの「これらを参考に作成」という依頼に対して、資料内の初回開発案を今回の着手範囲として採用しました。文書にある全フェーズの実装を一括して進める解釈はしていません。S0 と S1 の P1-01 → P1-02 → P1-03 を順番に実装しました。

- TypeScript の VS Code 拡張基盤、F5 用設定、Vitest、Mocha による統合テスト設定。
- schemaVersion 1 の型定義、JSON 初期化・保存・再読込・既存記録を保持する追記。
- `CheckpointStorage` による I/O 注入。単体テストではメモリ I/O を使用。
- VS Code の `globalStorageUri` に接続するアダプタ。一時ファイルからの置換で保存。
- npm scripts、依存固定、GitHub Actions、README、TDD 実行ログ。

エディタ情報取得、Git 解析、保存コマンド、再開・削除 UI は未実装です。起動時にはストレージを構成するだけで、ディスク読込や書込も行いません。

## TDD の実行証跡

以下の RED / GREEN では、各行の同じコマンドを使用しました。最小スタブを置いたうえで目的のアサーションが失敗することを確認し、その後に実装しました。ログ内のチェックポイントはすべて架空のテストデータです。

| テスト ID / 仕様 | コマンド | RED の観測結果 | GREEN | 整理後の回帰 |
| --- | --- | --- | --- | --- |
| P1-01 / SPEC §6 | `npm run test:unit -- tests/checkpointStore.test.ts -t P1-01` | `undefined` が返り、空のバージョン付きコレクションとの一致に失敗 | 対象1件成功 | 全2件成功 |
| P1-02 / SPEC §5・§6 | `npm run test:unit -- tests/checkpointStore.test.ts -t P1-02` | 保存後も `checkpoints: []` が返り、保存した1件との一致に失敗 | 対象1件成功 | 全3件成功 |
| P1-03 / SPEC §6 | `npm run test:unit -- tests/checkpointStore.test.ts -t P1-03` | 追記すると既存の1件が消失し、期待する2件との一致に失敗 | 対象1件成功 | 全4件成功 |

P1-01 は空のコレクションを返す最小実装とし、整理時も不要な抽象化は追加していません。P1-02 は JSON と I/O 境界を分離した構造を維持し、同じ偽 I/O を共有する新インスタンスから全フィールドが再読込できることを検証しました。P1-03 の GREEN では既存配列への追記、REFACTOR では配列を直接変更しない新配列の生成と読みやすい JSON 整形に変更し、全テストで回帰確認しました。

実行ログ:

| ID | RED | GREEN | 回帰 |
| --- | --- | --- | --- |
| P1-01 | [ログ](docs/tdd-evidence/P1-01-red.log) | [ログ](docs/tdd-evidence/P1-01-green.log) | [ログ](docs/tdd-evidence/P1-01-regression.log) |
| P1-02 | [ログ](docs/tdd-evidence/P1-02-red.log) | [ログ](docs/tdd-evidence/P1-02-green.log) | [ログ](docs/tdd-evidence/P1-02-regression.log) |
| P1-03 | [ログ](docs/tdd-evidence/P1-03-red.log) | [ログ](docs/tdd-evidence/P1-03-green.log) | [ログ](docs/tdd-evidence/P1-03-regression.log) |

[S0 基盤確認](docs/tdd-evidence/S0-setup.log)と[S1 リファクタリング後の検証](docs/tdd-evidence/S1-refactor.log)も保存しました。S0 の設定作業は製品機能の RED/GREEN として数えていません。

## 最終検証

| 項目 | 実行結果 |
| --- | --- |
| `npm run verify` | 成功。型チェック → 単体4件 → ビルド。 [ログ](docs/tdd-evidence/final-verify.log) |
| `npm run test:coverage` | 成功。保存サービスの statements / branches / functions / lines はすべて 100%。 [ログ](docs/tdd-evidence/final-coverage.log) |
| `VSCODE_EXECUTABLE_PATH='/Applications/Visual Studio Code.app/Contents/MacOS/Code' npm run test:integration` | ビルド成功後、VS Code 起動が `SIGABRT`。Mocha の2件は実行されていない。 [ログ](docs/tdd-evidence/final-integration.log) |
| F5 手動起動 | 未検証 |
| GitHub Actions | ワークフローを配置済み。リモート実行は未実施 |
| Windows / Linux / 最小 VS Code バージョン | 未検証 |

VS Code 1.144.0 のクラッシュ診断には `EXC_CRASH / SIGABRT` と `_RegisterApplication` / `___RegisterApplication_block_invoke` が記録されていました。拡張テスト本体の成否は判断できません。GUI が利用できる開発環境で上記の統合テストを実行し、F5 で起動を確認してください。既定の `npm run test:integration` はテスト用 VS Code を取得して実行できます。

最初の起動試行では実行ファイル名を `Electron` と指定したため `ENOENT` になり、インストール内容を確認して `Code` に修正しました。最初のアダプタ型チェックでは VS Code の `Thenable` に `.catch` がないため失敗し、`try/catch` に修正して最終検証は成功しました。この失敗は製品機能の RED に数えていません。[型チェック初回ログ](docs/tdd-evidence/adapter-typecheck-initial.log)

カバレッジの対象は `src/services/` の1ファイルだけです。VS Code アダプタ、エラー経路、UI の検証完了を意味しません。統合テストは拡張起動と、専用ワークスペース内での実ファイル I/O 往復を検証する内容を用意しています。P1-17 / P1-18 の保存コマンド統合テストは S6 で追加予定です。

## 残課題と次のスライス

次は **S2 / P1-04 → P1-05 → P1-06** です。

1. P1-04: JSON の構造・schemaVersion・各チェックポイントのランタイム検証と、明確なエラー。
2. P1-05: 破損データの読込後に保存しても、元データを上書きしないことのテスト。
3. P1-06: 書込・一時ファイル置換の失敗を通知側へ伝えるテスト。

今は JSON を型アサーションで読み込む段階であり、不正な形式を安全に利用できる保証はありません。同時書込や複数 VS Code ウィンドウ間の競合制御も未実装です。実データを扱う UI は後続スライスで追加します。MVP 全体や Phase 1 の完成としては扱っていません。

依存監査では、開発用の `@vscode/test-cli` 配下に8件（high 1 / moderate 6 / low 1）の警告があり、npm の自動修正候補はありませんでした。[監査結果](docs/development-dependency-audit.json)。本番依存は追加しておらず、`npm audit --omit=dev` は0件でした。互換性未確認のメジャー版を強制指定する変更は加えていません。

## 変更ファイル

| 区分 | ファイル |
| --- | --- |
| 参照資料のコピー | `SPEC.md`、`TEST_PLAN.md`、`AGENTS.md`、`CODEX_START_PROMPT.md` |
| 拡張の接続 | `src/extension.ts` |
| データ契約・保存 | `src/models/checkpoint.ts`、`src/services/checkpointStore.ts`、`src/adapters/vscodeCheckpointStorage.ts` |
| 単体テスト | `tests/checkpointStore.test.ts`、`tests/checkpointFixture.ts`、`tests/memoryStorage.ts`、`tests/setup.test.ts` |
| 統合テスト | `src/test/extension.test.ts`、`.vscode-test.mjs` |
| ビルド・テスト基盤 | `package.json`、`package-lock.json`、`tsconfig.json`、`tsconfig.unit.json`、`vitest.config.mts` |
| 開発環境・CI | `.vscode/launch.json`、`.vscode/tasks.json`、`.github/workflows/ci.yml`、`.gitignore` |
| 利用・検証記録 | `README.md`、`DEVELOPMENT_LOG.md`、`docs/tdd-evidence/*.log`、`docs/development-dependency-audit.json` |
