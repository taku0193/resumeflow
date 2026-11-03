# ResumeFlow

中断時のメモ・次の行動・プロジェクト・任意のGit状態をローカルに保存し、別のCLIプロセスから再開用Markdownを取得できます。エディタ、AI API、サーバー、ネットワーク接続を実行時に必要としません。CLI MVPは実装済みで、[受入CI](https://github.com/taku0193/resumeflow/actions/runs/41585586691) がLinux・macOS・Windowsで成功しました。最終E2Eと配布の変更は [PR #24](https://github.com/taku0193/resumeflow/pull/24) にまとめています。

## 使い始める

Node.js 22.12以降とnpmを使用します。依存関係を取得する初回だけネットワーク接続が必要です。

```bash
npm ci
npm run build
npm run cli -- help
npm run cli -- save --note "一覧表示まで実装" --next "異常系を確認する"
npm run cli -- list
```

一覧に表示されたUUIDを、次の `UUID` と置き換えます。

```bash
npm run cli -- show UUID --format json
npm run cli -- context UUID
npm run cli -- delete UUID
```

削除は端末で確認し、キャンセルできます。非対話実行では明示の `--yes` が必要です。保存先はカレントディレクトリのプロジェクトで、別の場所を対象にする場合は、各操作へ `--project /absolute/path/to/project` を追加します。Gitメタデータは `save --allow-git` を指定したときだけ取得します。

機械処理には `--format json` を使います。成功はstdout、エラーはstderrのJSONと非0終了コードです。`context` の既定はMarkdownです。詳細な引数、エラー、スキーマは [CLI_SPEC.md](CLI_SPEC.md) を参照してください。

## Codexから使う

[同梱skill](skills/resumeflow-checkpoint/SKILL.md) は保存・一覧・再開の依頼をCLIにつなぎます。JSONリクエストを [bridge.mjs](skills/resumeflow-checkpoint/scripts/bridge.mjs) へ渡し、引数配列で起動するため、メモをシェル命令として扱いません。リポジトリ同梱での配布までを実装し、ユーザー環境へのskill導入は行っていません。

メモには現在の依頼で提供された内容を渡します。会話履歴・端末履歴・Codex内部データを自動取得しません。再開出力は参照データであり、会話やエージェント内部状態の完全復元ではありません。

## 配布パッケージ

```bash
npm run build
npm pack --ignore-scripts
```

生成されるローカルtgzにはCLIとskillを含み、開発用依存・テスト・保存データ・プロファイルを含めません。`bin` 名は `resumeflow` です。別ディレクトリへのオフラインインストールと、インストール済みCLI・skillからの取得をE2Eで検証しています。npmレジストリやMarketplaceには公開していません。

## 保存データ

| OS | 既定のデータディレクトリ |
| --- | --- |
| macOS | `~/Library/Application Support/ResumeFlow` |
| Windows | ホーム配下の `AppData/Local/ResumeFlow` |
| Linux等 | `~/.local/share/resumeflow` |

`--data-dir /absolute/path` で変更できます。プロジェクトはrealpathのfile URIで識別し、一覧・詳細・削除を他プロジェクトから分離します。ファイル本文・未保存バッファ・環境変数の値を収集しません。CLIではエディタ情報を「未取得」と表示し、未保存編集の有無を推測しません。

新規記録はスキーマ2です。旧スキーマ1は検証して表示できますが、保存・削除は読取専用エラーになります。旧データを保持し、新しい空の `--data-dir` を指定してください。破損JSON・不正UTF-8は変更しません。

保存・削除はアプリ専用lockと一時ファイルからの置換で保護します。同時書込は `DATA_BUSY` で失敗します。異常終了で `.write.lock` が残った場合は、書込プロセスが動いていないことを確認してから、そのアプリ用lockを手動で取り除きます。自動で古いlockを削除する機能はありません。

## 開発と検証

Issue → 機能別ブランチ → 小さな検証済みコミット → PR / CI → マージ・Issue完了の順で進めます。ローカルのVS Codeは起動せず、このチャットとCLIで開発します。[ROADMAP.md](ROADMAP.md) と [TDD記録](docs/CLI_TDD_LOG.md) に範囲・証跡を記録しています。

| コマンド | 検証する層 |
| --- | --- |
| `npm run verify` | 型、純粋単体174件、Node実ファイルI/O 8件、ビルド |
| `npm run test:coverage` | models/servicesの単体カバレッジ |
| `npm run test:tools` | 0件・skip・only等を拒否するゲート3件 |
| `npm run test:node:io` | 実ファイルI/O・プロジェクト解決8件 |
| `npm run test:node:integration` | 架空リポジトリを使う実Git 2件 |
| `npm run test:cli:e2e` | 公開CLIの別プロセス操作・配布物・skill 13件 |
| `python3 scripts/cli-tty-e2e.py` | POSIXの実端末で取消・承認2件（ビルド後） |
| `npm run test:e2e:package` | GUIなしのVSIX配布対象検査 |
| `npm run test:integration` | CI / Xvfb内のVS Code API統合15件 |
| `npm run test:e2e` | CI / Xvfb内の実VS Code UIスモーク1件 |

ローカルmacOS / Node26で上記のGUI以外を実行済みです。コアのstatements 99.53%、branches 97.81%を確認しました。アダプタ・CLI・UIの網羅率を表す数字ではありません。CIはNode22を使用し、Node I/O・Git・CLIをLinux / macOS / Windows、TTYと既存のAPI / UIをLinuxで検証します。[CI一覧](https://github.com/taku0193/resumeflow/actions/workflows/ci.yml)。各スイートは0件・skip・onlyを成功扱いにしません。焦点を絞ったTDD実行では未選択ケースを除外します。

## 現在の範囲

CLIの保存・一覧・詳細・文脈取得・確認付き削除、任意のGit取得、Codex skillを実装しました。エディタ対応先の選定は保留です。既存のVS Code基盤はS0〜S3の保存・エディタ情報取得までで、コマンドパレットの保存・再開UIは未実装です。既存UI E2E 1件はインストール画面の確認です。ファイルやカーソルの復元を実装済みとは扱いません。[UI E2Eの未実装範囲](E2E_PLAN.md) を参照してください。
