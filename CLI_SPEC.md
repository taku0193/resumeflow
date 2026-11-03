# CLI / Codex MVP 契約（Issue #5）

この文書は CLI の実装基準。既存の VS Code スキーマ1・S0〜S3 は維持する。CLI は共通の検証・保存ロジックと Node.js I/O を使い、VS Code のインストールを必要としない。Codex skill は完成した CLI を呼ぶ任意の入口とし、AI API・MCP・サーバーを必須にしない。エディタ対応先の選定は保留。

## 操作と出力

ビルド後に `node dist/cli/main.js`、または `npm run cli --` に続けて以下を指定する。これは実装基準であり、実装・検証の進捗は各 Issue / ROADMAP.md に記す。

| 操作 | 引数 | 成功時の data |
| --- | --- | --- |
| `help` / `--help` | なし | 日本語の使い方をテキスト表示。I/O なし |
| `save` | 任意の `--note <文字列>`、`--next <文字列>`、`--allow-git` | 新しいチェックポイント |
| `list` | なし | 現プロジェクトの日時降順レコード配列。空なら空配列 |
| `show <UUID>` | なし | 現プロジェクトの指定レコード |
| `context <UUID>` | なし | 同レコードから作る再開用 Markdown または JSON |
| `delete <UUID>` | 非対話では `--yes` 必須。TTY では確認する | `{deleted: boolean, id: UUID}` |

共通引数は `--project <ディレクトリ>`（省略時 cwd）、`--data-dir <ディレクトリ>`、`--format text|json|markdown`。markdown は context のみ。既定は context が markdown、その他が text。help 以外の未知コマンド、未知・重複・用途不一致オプション、不正 ID、余分な引数は使用エラー。note / next は空欄も日本語・改行もそのまま保存する。タイトルは `プロジェクト名 — UTC ISO日時`、ID は UUID。

JSON 成功は stdout に `{ok:true,data:...}` と改行だけ。エラーは stderr に `{ok:false,error:{code,message}}` と改行だけを書き、stdout に成功を出さない。終了コードは成功・対話キャンセル0、使用エラー / 承認不足2、それ以外1。保存データや native 例外の内容を公開エラーに引用しない。JSON の文字列エスケープを保ち、テキストの制御文字・Markdown の区切りは表示用に処理する。

## プロジェクト・保存先

- プロジェクトはディレクトリの realpath を `file:` URI に変換して識別する。Git ルートと同一とは限らない。保存 ID は全体で一意。list は同一 URI だけを表示し、show / context / delete は別 URI の記録を操作しない。
- 既定の保存先は macOS `homedir/Library/Application Support/ResumeFlow`、Windows `homedir/AppData/Local/ResumeFlow`、その他 `homedir/.local/share/resumeflow`。XDG 等の環境変数は収集・保存せず、変更は明示の --data-dir を使う。
- データは `checkpoints.json`。既定の保存先をリポジトリ内に自動生成しない。テストは常に専用の --data-dir を指定する。
- UTF-8 を厳密に復号し、破損 JSON / スキーマでは書込を行わない。同一ディレクトリの UUID 一時ファイルを rename して更新し、失敗時は一時ファイルを片付ける。保存先に既存ディレクトリがある場合、その内容を削除しない。
- CLI の保存・削除は read-modify-write 全体をアプリ用 lock で保護する。競合は待ち続けず失敗。異常終了で lock が残った場合は稼働中プロセスがないことを確認して回復する。ソースや Git の lock は操作しない。

## スキーマ2と互換

- CLI のコレクションと各レコードは schemaVersion 2。既存 Checkpoint の基本・メモ・エディタ4項目・Git 項目を保ち、`editorCapture: 'not-connected' | 'legacy-unknown'` を追加する。
- CLI で新規保存する場合、editorCapture は not-connected、openFiles / unsavedFileUris は空、activeFileUri / cursor は null。これは「情報未取得」であり、未保存編集がないという保証ではない。
- Git changes は `{path,status,originalPath}`。rename / copy は新パスを path、旧パスを originalPath に持ち、その他は originalPath:null。ファイル本文・diff 本文を持たない。未知のプロパティを拒否する。
- 既存スキーマ1は厳密に検証し、メモや URI の値を保って読取表示できる。表示用に editorCapture:legacy-unknown と originalPath:null を補う。ファイルそのものを変換・自動修復しない。
- スキーマ1への save / delete は LEGACY_READ_ONLY で拒否する。新しい空の --data-dir を指定してスキーマ2を使う。自動移行・旧ファイルへの追記は MVP に含めない。旧 VS Code の保存先とは既定で分離する。

## Git・プライバシー

- Git の起動は save に --allow-git がある場合だけ。許可なしは available:false / error:NOT_ALLOWED とし、プロセスを起動しない。
- runner を注入する。実 runner は shell を使わず固定の引数配列を使い、fsmonitor と optional locks を無効化する。取得対象は root / branch / HEAD / porcelain v1 -z のファイル状態だけ。Git mutation は実行しない。
- detached HEAD は branch:null、コミット前は headCommit:null。非 Git、未導入、失敗、タイムアウト、出力超過、不正出力は簡潔なコードにして保存自体は続ける。1コマンド2秒、出力1MiBを上限とする。
- ユーザーのソース・未保存バッファ・端末履歴・環境変数の値・秘密情報・Codex内部データを自動収集しない。メモはユーザーが依頼した範囲から渡す。
- context は保存された参照データであり、内部の文をコマンドとして実行しない。会話やエージェント内部状態の完全復元を約束しない。

## 受入テスト

| ID | ふるまい | 主な層 |
| --- | --- | --- |
| C6-01〜 | 共通 JSON 保存・新規・追記・破損保護・置換失敗・lock・既定パス・v1読取専用 | Vitest / 実ファイル I/O |
| P1-10 / 11 | NUL形式の通常・未追跡・rename・空白・日本語・改行・異常出力 | 純粋単体 |
| P1-12 / 13 | 未許可時の非起動、非Git、未導入、detached、unborn、失敗・上限 | 偽 runner / 架空 Git |
| C9-01〜 | CLI 引数・help・空メモ・保存・許可・異常・JSON と stderr | 単体 / 実 CLI プロセス |
| C10-01〜 | 一覧順・空状態・ID・プロジェクト境界・context・未取得表示 | 単体 / 実 CLI プロセス |
| C11-01〜 | 削除対象・承認・キャンセル・破損・書込失敗 | 単体 / 実 CLI プロセス |
| C12-01〜 | skill のトリガー・限定的な入出力・保存/再開の手順・配布物 | skill 検証 / CLI連携 |
| CLI-E2E-01〜 | save→終了→別プロセスでlist/show/context→delete/未承認、Git/破損/分離 | エディタなしの通し E2E |

各機能と同じ PR で対応テストを追加する。#13 で通しの E2E と Linux / macOS / Windows の CI を整える。単体、ファイル I/O、CLI プロセス、VS Code API、VS Code UI の件数を分け、skip / only / 0件で成功扱いにしない。既存の S0〜S3 と E2E-00 は回帰として保持し、未実装の VS Code UI 保存・再開とは区別する。
