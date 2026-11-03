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

## S0 / S1 初回のローカル検証

| 項目 | 実行結果 |
| --- | --- |
| `npm run verify` | 成功。型チェック → 単体4件 → ビルド。 [ログ](docs/tdd-evidence/final-verify.log) |
| `npm run test:coverage` | 成功。保存サービスの statements / branches / functions / lines はすべて 100%。 [ログ](docs/tdd-evidence/final-coverage.log) |
| `VSCODE_EXECUTABLE_PATH='/Applications/Visual Studio Code.app/Contents/MacOS/Code' npm run test:integration` | ビルド成功後、VS Code 起動が `SIGABRT`。Mocha の2件は実行されていない。 [ログ](docs/tdd-evidence/final-integration.log) |
| F5 手動起動 | 未検証 |
| GitHub Actions | この初回確認時点では未実施。その後の成功結果は次節を参照 |
| Windows / Linux / 最小 VS Code バージョン | この初回確認時点では未検証。Linux はその後 CI で検証済み |

VS Code 1.144.0 のクラッシュ診断には `EXC_CRASH / SIGABRT` と `_RegisterApplication` / `___RegisterApplication_block_invoke` が記録されていました。このローカル試行では拡張テスト本体の成否は判断できませんでした。ユーザーの希望により、以後ローカルの VS Code は開かず、統合テストを GitHub Actions の Xvfb 上で実行する方針に変更しました。

最初の起動試行では実行ファイル名を `Electron` と指定したため `ENOENT` になり、インストール内容を確認して `Code` に修正しました。最初のアダプタ型チェックでは VS Code の `Thenable` に `.catch` がないため失敗し、`try/catch` に修正して最終検証は成功しました。この失敗は製品機能の RED に数えていません。[型チェック初回ログ](docs/tdd-evidence/adapter-typecheck-initial.log)

カバレッジの対象は `src/services/` の1ファイルだけです。アダプタのエラー経路や UI の検証完了を意味しません。統合テストは拡張起動と、専用ワークスペース内での実ファイル I/O 往復を検証する内容で、次節の CI で実行済みです。P1-17 / P1-18 の保存コマンド統合テストは S6 で追加予定です。

## GitHub 管理と CI の実行結果

ユーザーの追加依頼に基づき、`taku0193/resumeflow` を非公開リポジトリとして作成しました。初期コミット `79d574393c4064700fbfa648dc1ab3fb349996e0` にソース、仕様書、TDD の実行記録を登録し、`main` を push 済みです。

HTTPS 認証では workflow スコープ不足により Actions 定義を含む push が拒否されました。既存の SSH 認証を利用して解決し、origin は `git@github.com:taku0193/resumeflow.git` に設定しています。認証情報をソースや Git 設定に保存していません。

[GitHub Actions 実行 41556242212](https://github.com/taku0193/resumeflow/actions/runs/41556242212) は以下の結果で成功しました。

| ジョブ | 環境・内容 | 結果 |
| --- | --- | --- |
| unit | `npm ci` → `npm run verify`（型チェック・単体4件・ビルド） | 成功 |
| integration | Ubuntu 26.04.1 / Node.js 22.23.4 / VS Code 1.144.1、`xvfb-run -a npm run test:integration` | 2件成功、exit 0 |

統合テストの成功項目は `the extension activates in VS Code` と `stores JSON and reloads it using a fresh adapter and service` です。ローカルで未確認だった基本の VS Code I/O が CI 上で確認できました。Windows と最小 VS Code バージョンは引き続き未検証です。

初回 CI で Actions v4 の Node.js 20 実行基盤に非推奨警告が出たため、公式のリリース情報・action.yml を確認し、`actions/checkout@v7.0.1` と `actions/setup-node@v7.1.0`（Node.js 24 実行基盤）に更新しました。製品の TypeScript コードは変更していません。以後の開発方針は `AGENTS.md` に記録しました。

## 残課題と次のスライス

### UI E2E 基盤の追加（2026-11-03）

ユーザーの追加依頼を受け、`E2E_PLAN.md` と実画面テスト用の `src/e2e/installedExtension.test.ts` を追加しました。既存の統合2件は直接 API を呼ぶ検証として維持し、UI E2E には数えていません。

- 実装: E2E-00（インストールした VSIX を拡張ビューから選び、詳細を確認するスモークテスト）。機能の追加順は変更せず、保存・再開・削除の E2E は対応するスライスで追加します。
- 基盤: `vscode-extension-tester@8.28.1` / Selenium、テスト専用プロファイル、ツールの tested range 上限に合わせた固定 VS Code 1.140.0、GitHub Actions / Xvfb の `e2e` ジョブ。最新版は既存の API 統合テストで検証します。
- 配布: `package.json` の files を許可リストにし、`scripts/package-e2e.mjs` で実際の配布対象も検査します。`@vscode/vsce` は直接利用するため開発依存として明示しました。
- 証跡: スクリーンショットと必要なログを artifact に7日保存。0件・skip・only は失敗、リトライ0回です。
- ローカル: 型チェック・単体テスト4件・ビルドと VSIX 作成に成功。ローカル GUI は起動しません。
- TDD の扱い: 今回はテスト基盤の整備と既存動作への保護テストであり、製品機能の新しい RED/GREEN サイクルとしては数えません。

実画面 E2E の最新結果と画像は [GitHub Actions](https://github.com/taku0193/resumeflow/actions/workflows/ci.yml) で確認します。製品の保存・再開シナリオはまだ未実装であり、今回のスモークテストでその検証完了を意味しません。

初回 CI [41557956875](https://github.com/taku0193/resumeflow/actions/runs/41557956875) は、VSIX のインストールまで成功しましたが、ランナーが `.cjs` 形式の Mocha 設定を受け付けず、実画面のテスト本体に進む前に失敗しました。対応する JSON 形式に修正しました。この失敗は製品機能の RED として扱いません。失敗時でも artifact にランナーログと VS Code ログを保存できることは確認しました。

2回目の CI [41558142572](https://github.com/taku0193/resumeflow/actions/runs/41558142572) は実画面に到達しましたが、拡張一覧の検索で一覧が再描画され、ExTester の保持する要素参照が失効して失敗しました。失敗画像とログを確認し、初期のインストール済み一覧を期限付きで待って毎回参照を取り直す方式に修正しました。テスト全体のリトライや期待値の緩和はしていません。画像で判明した日本語フォント不足と、親リポジトリを検出するテスト配置も修正しました。

修正版の CI [41558662439](https://github.com/taku0193/resumeflow/actions/runs/41558662439) は、単体4件・統合2件・実画面 E2E 1件がすべて成功しました。実行ログは `E2E-00` の `1 passing` を示し、[画像・ログの artifact](https://github.com/taku0193/resumeflow/actions/runs/41558662439/artifacts/13195751462) も保存済みです。これはパッケージ・画面表示のスモークテストの成功であり、未実装の保存・再開機能の E2E 成功としては数えません。

E2E 作業中に、ユーザーから機能別ブランチとこまめなコミットの指定が追加されました。それ以前に main へ push 済みの履歴は保持し、以降の E2E 関連作業は `codex/e2e-foundation` に移しています。新しい機能では専用ブランチを作成し、小さな検証済みの単位でコミットして PR で管理します。

次は **S2 / P1-04 → P1-05 → P1-06** です。

1. P1-04: JSON の構造・schemaVersion・各チェックポイントのランタイム検証と、明確なエラー。
2. P1-05: 破損データの読込後に保存しても、元データを上書きしないことのテスト。
3. P1-06: 書込・一時ファイル置換の失敗を通知側へ伝えるテスト。

今は JSON を型アサーションで読み込む段階であり、不正な形式を安全に利用できる保証はありません。同時書込や複数 VS Code ウィンドウ間の競合制御も未実装です。実データを扱う UI は後続スライスで追加します。MVP 全体や Phase 1 の完成としては扱っていません。

初回の依存監査では開発依存に8件の警告がありました。E2E ツール追加後の再監査では10件（high 1 / moderate 8 / low 1）です。[現在の監査結果](docs/development-dependency-audit.json)。本番依存は追加しておらず、初回の `npm audit --omit=dev` は0件でした。互換性未確認のメジャー版を強制指定する変更は加えていません。

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
