# ResumeFlow

開発作業を中断するときの文脈をチェックポイントに保存し、再開を助けるローカルツールを開発しています。現在は VS Code 拡張の基盤があります。今後は **CLI / Codex だけでも使える入口**を優先し、エディタ連携を追加機能として扱います。[Issue ロードマップ](ROADMAP.md) と [親 Issue #4](https://github.com/taku0193/resumeflow/issues/4) を参照してください。

現在は **S0〜S3 の開発用基盤・保存層・エディタ取得**です。完成した拡張機能ではありません。コマンドパレットからの保存・一覧・再開・削除は、後続の開発スライスで追加します。

CLI と Codex 用 skill はまだ未実装です。次は [Issue #5](https://github.com/taku0193/resumeflow/issues/5) で CLI のコマンド・データ契約・受入テストを定義します。エディタ対応先の選定は保留しています。`SPEC.md` と `TEST_PLAN.md` は S0〜S3 と従来の VS Code 操作の基準で、CLI 向けの改訂は Issue で追跡します。

## 開発環境

- Node.js 22.12 以降（22系・24系・26以降）、npm
- VS Code 1.100 以降
- 統合テストには GUI のある環境が必要です。Linux CI は `xvfb-run` を使用します。

```bash
npm ci
npm run verify
npm run test:coverage
```

`package-lock.json` で依存関係を固定しています。単体テストは Vitest、統合テストは `@vscode/test-cli` / `@vscode/test-electron` と Mocha を使用します。

UI E2E は ExTester / Selenium で、インストールした VSIX を実画面から操作します。`npm run test:e2e` はローカル起動を拒否し、GitHub Actions の Xvfb 上でのみ実行します。CI の `e2e` ジョブではスクリーンショット・実行ログを artifact として7日間保存します。[E2E 計画とシナリオ一覧](E2E_PLAN.md)

現在の UI E2E はパッケージのインストールと拡張詳細画面のスモークテスト（E2E-00）です。保存・再開・削除はまだ未実装のため、それらの E2E は機能実装に合わせて追加します。API 統合テストとは区別して結果を報告します。[最新の CI 結果](https://github.com/taku0193/resumeflow/actions/workflows/ci.yml)

ローカルの検証済み環境は macOS arm64 / Node.js 26.13.0 / npm 11.20.0 です。S3 では型チェック・単体テスト93件・ビルド・VSIX の配布対象検査が成功しました。models / services の実行コード6ファイルの単体カバレッジは statements / branches ともに 100% です。アダプタや UI の網羅率を表す数字ではありません。[CI](https://github.com/taku0193/resumeflow/actions/runs/41567531558) でも単体93件・API統合15件・UI E2E 1件が成功しました。詳細は [S2](docs/S2_TDD_LOG.md) / [S3 の TDD 記録](docs/S3_TDD_LOG.md) を参照してください。

初回 S0 / S1 の GitHub Actions では単体4件・統合2件が成功しました。Ubuntu 26.04.1 / Node.js 22.23.4 / VS Code 1.144.1 の Xvfb 上で拡張起動と実ファイル保存・再読込を確認した結果です。[初回 CI](https://github.com/taku0193/resumeflow/actions/runs/41556242212)。その後のスライスで検証ケースを追加しており、現在の件数は S3 の記録に示しています。

初回の macOS ローカル実行では VS Code 起動時に `SIGABRT` が発生しました。以後、ローカル VS Code の起動は行わず、GUI が必要な検証は CI で実行します。F5 手動起動は未検証です。詳細な証跡と制約は [開発記録](DEVELOPMENT_LOG.md) を参照してください。

統合テストは毎回 `.test-data/run-*` に専用ワークスペース・ユーザーデータ・拡張領域を作ります。通常の VS Code 設定や保存領域は使いません。初回はテスト用 VS Code をダウンロードします。インストール済みの実行ファイルを指定することもできます。

```bash
# macOS: インストール済み VS Code を使用する場合
VSCODE_EXECUTABLE_PATH='/Applications/Visual Studio Code.app/Contents/MacOS/Code' npm run test:integration
```

テスト終了後、不要になった `.test-data/` と `.vscode-test/` は削除可能です。

## このプロジェクトの開発方法

コード編集と単体検証は、このチャットとワークスペース内で進めます。ローカルの VS Code 起動は開発の前提にしません。GitHub では [taku0193/resumeflow](https://github.com/taku0193/resumeflow) を非公開で管理し、GitHub Actions で型チェック・単体テスト・ビルド・Xvfb 上の拡張統合テストを実行します。`main` への push と pull request が CI の実行対象です。

新規作業は受入条件のある Issue を起点にします。機能ごとに `codex/issue-<番号>-<feature>` などのブランチを切り、PR に Issue を関連付けます。機能の変更を `main` へ直接コミットしません。テスト1件の GREEN と回帰確認、リファクタリング、文書更新など、小さな完了単位でコミットします。必要な検証が完了した Issue は PR・証跡・統合状態を残して適宜閉じ、未完了の Issue は開いたままにします。

## 開発用拡張の起動（後日、手動確認が必要な場合）

1. この `resumeflow` フォルダを VS Code で開きます。
2. `npm ci` を実行します。
3. F5 で `Run ResumeFlow Extension` を起動します。
4. Extension Development Host が開きます。現段階では起動の確認のみ可能です。操作コマンドはまだありません。

## npm scripts

| コマンド | 用途 |
| --- | --- |
| `npm run test:unit` | VS Code 実体を使用しない単体テスト |
| `npm run test:unit:watch` | 単体テストの継続実行 |
| `npm run test:coverage` | コアサービスのカバレッジ |
| `npm run test:integration` | ビルド後、専用 VS Code で統合テスト |
| `npm run test:e2e` | CI / Xvfb 上で VSIX をインストールし、実画面を操作 |
| `npm run test:e2e:package` | GUI を使わず VSIX の作成・配布対象の検査 |
| `npm run typecheck` | 拡張コード・テストの型チェック |
| `npm run build` | TypeScript から `dist/` にコンパイル |
| `npm run verify` / `npm test` | 型チェック → 単体テスト → ビルド |

## 構成

- `src/extension.ts`: 拡張の起動と依存関係の接続
- `src/models/`: チェックポイントの型・実行時検証、エディタのメタデータ契約
- `src/services/`: VS Code に依存しない保存・エディタ取得の規則
- `src/adapters/`: VS Code のストレージ I/O とタブ・カーソル情報の取得
- `tests/`: メモリ上の偽 I/O を使う単体テスト
- `src/test/`: VS Code Extension Development Host 内の統合テスト
- `src/e2e/`: ExTester / Selenium による実画面 E2E
- `scripts/`: VSIX パッケージの検査、CI 専用 E2E 起動
- `.github/workflows/ci.yml`: 型・単体・ビルド、Linux GUI 統合、実画面 E2E と証跡保存

## 保存データとプライバシー

保存先は `ExtensionContext.globalStorageUri` 配下の `checkpoints.json` です。チェックポイントは `schemaVersion: 1` を使用します。製品コードはネットワーク通信、Git 操作、ソースや未保存バッファの本文取得を行いません。npm のインストールおよび統合テスト用 VS Code の取得にはネットワーク接続が必要です。

ストレージ層では、schemaVersion・必須項目・データ型・URI・ID の重複などを実行時に検証します。JSON や UTF-8 が破損している場合は読み込みと追記を拒否し、元データを保持します。I/O の読み書き失敗もエラーとして呼出し側へ伝えます。保存 UI は S5 で追加予定で、実データを扱うコマンドはまだありません。テストは専用保存領域で実行します。

エディタ取得は通常のワークスペース内 `file:` テキストタブを対象とし、画像・diff・外部ファイル・仮想 URI を除外します。dirty な対象ファイルの URI と untitled の警告件数を返し、本文は読みません。警告件数は一時情報で、保存 JSON には追加しません。所属判定は VS Code API による URI 上の所属で、シンボリックリンクの実体は S3 で解決しません。再開時の実在・リンク先の確認は S8 の対象です。

## 開発範囲

| スライス | 内容 | 状態 |
| --- | --- | --- |
| S0 | 雛形・単体／統合テスト基盤 | 実装済み。CI の Extension Host 起動も成功 |
| S1 | P1-01 初期化、P1-02 保存・再読込、P1-03 追記 | 単体検証と CI の実 VS Code I/O 検証が成功 |
| S2 | P1-04〜06 スキーマ検証・破損保護・書込失敗 | 単体76件・CI の実 I/O 含む統合6件が成功 |
| S3 | P1-07〜09 タブ・アクティブ座標・未保存メタデータ取得 | 単体93件・CI の API 統合15件・UI E2E 1件が成功 |
| S4〜S6 | Git取得・保存 UI・保存コマンド統合 | 未着手。CLI / Codex 優先の [Issue #4](https://github.com/taku0193/resumeflow/issues/4) へ引き継ぐ |
| S7〜S9 | 一覧・再開・削除 | 未着手 |

資料内で MVP の v0.1 / v0.2 表記が混在していますが、v0.2 を開発手順の改定、保存スキーマを 1 と解釈しています。初回の作業範囲には `CODEX_START_PROMPT.md` の S0 / S1 を採用しています。

参考: [VS Code 公式の拡張統合テスト手順](https://code.visualstudio.com/api/working-with-extensions/testing-extension)、[Vitest 公式ガイド](https://vitest.dev/guide/)。
