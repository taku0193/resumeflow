# CLI / Codex を入口にする開発ロードマップ

親タスク: [Issue #4](https://github.com/taku0193/resumeflow/issues/4)。CLI または Codex だけで中断の文脈を保存し、再開時に取り出せる入口を追加する。エディタ対応先の選定は保留。

CLIの保存・一覧・詳細・再開用Markdown・確認付き削除とCodex skillを実装した。既存S0〜S3も保持している。#5〜12と#14はマージ済み、#13は最終CI確認中。使い方は README.md / CLI_SPEC.md を参照。

## 目指す利用の流れ

1. CLI から、または Codex で「ここで中断するので保存して」と依頼し、中断メモ・次の行動・プロジェクト・許可された Git メタデータを保存する。
2. 再開時に一覧・詳細・再開用 Markdown を取得し、Codex に作業文脈として読ませる。
3. 必要がなくなったチェックポイントを確認して削除する。

再開用出力は、会話やエージェント内部状態の完全復元ではない。エディタ情報の未取得を「未保存ファイルなし」とみなさない。本文・端末履歴・環境変数・認証情報・Codex内部データの自動収集は行わない。コマンド、保存先、データ契約、旧スキーマ1の読取専用方針は CLI_SPEC.md に定義している。

## Issue と依存順

| Issue | 内容 | 前提 | 現在 |
| --- | --- | --- | --- |
| [#14](https://github.com/taku0193/resumeflow/issues/14) | Issue 起点のルールと本ロードマップを記録 | #4 の方針 | 完了・PR #15 マージ済み |
| [#5](https://github.com/taku0193/resumeflow/issues/5) | CLI 優先の仕様・データ契約・受入テスト | #4 の方針 | 完了・PR #16 マージ済み |
| [#6](https://github.com/taku0193/resumeflow/issues/6) | CLI 用のローカル保存アダプタと保存先設定 | #5 | 完了・PR #17 マージ済み |
| [#7](https://github.com/taku0193/resumeflow/issues/7) | Git 状態の純粋な解析（従来 P1-10 / 11） | #5 | 完了・PR #18 マージ済み |
| [#8](https://github.com/taku0193/resumeflow/issues/8) | 許可条件を守る Git 取得（従来 P1-12 / 13） | #5、#7 | 完了・PR #19 マージ済み |
| [#9](https://github.com/taku0193/resumeflow/issues/9) | CLI からの保存 | #6、#8 | 完了・PR #20 マージ済み |
| [#10](https://github.com/taku0193/resumeflow/issues/10) | CLI の一覧・詳細・再開用 Markdown | #9 | 完了・PR #21 マージ済み |
| [#11](https://github.com/taku0193/resumeflow/issues/11) | CLI での確認付き削除 | #6、#9 | 完了・PR #22 マージ済み |
| [#12](https://github.com/taku0193/resumeflow/issues/12) | Codex の依頼を CLI へ接続する skill | #9、#10 | 完了・PR #23 マージ済み |
| [#13](https://github.com/taku0193/resumeflow/issues/13) | 別プロセスでの再開を含む CLI E2E / CI | #9、#10、#11 | 実装済み・PR #24 CI確認中 |

各機能の単体テストと該当 CLI E2E は、その機能の PR で追加する。#13 はテストの後回しではなく、終了・再起動を含む通しの完了ゲートを整備する作業である。実ファイル I/O 統合、CLI 実プロセス E2E、既存の VS Code UI E2E は結果を分ける。

## 開発と完了のルール

- Issue の受入条件と依存を確認し、機能別ブランチを作る。例: `codex/issue-5-cli-spec`。
- 1つのふるまいごとに RED → GREEN → 回帰を実行し、小さい完了単位でコミットする。文書変更に架空の RED/GREEN を付けない。
- PR に Issue・変更の意図・実際の検証結果・未検証の範囲を記載する。
- 実装と必要なテスト / CI が完了した Issue は、PR と証跡を残して適宜閉じる。CIの成功と実際のマージ状態を確認する。部分完了、未実装の機能、親ロードマップは開いたままにする。
- エディタ対応先は引き続き保留し、新規作業には別のIssueを立てる。S0〜S3 の既存テストと履歴は保持する。

Codex の skill は指示・資料・必要なスクリプトをまとめる仕組みである。[公式仕様](https://learn.chatgpt.com/docs/build-skills) を参照して #12 で実装・検証した。現在このプロジェクトの skill をユーザー環境にインストールしてはいない。
