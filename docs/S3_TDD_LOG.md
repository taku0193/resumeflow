# S3 / P1-07〜09: エディタ情報の取得

作業ブランチは `codex/s3-editor-capture`、[PR #3](https://github.com/taku0193/resumeflow/pull/3)。未マージの PR #2 のコードを前提とし、そのブランチを base とする。ローカル VS Code は起動していない。

## 実装

`EditorSnapshot` はタブ種別・URI・所属ワークスペース・dirty フラグ・アクティブ座標だけを受け取る境界で、本文取得のメソッドを持たない。純粋な `captureEditors` が保存用 `snapshot` と一時的な `warnings` に変換する。`readVscodeEditorSnapshot` が実 VS Code API との接続を担当する。

- 通常の `file:` テキストタブを全グループから取得し、URI を最初の出現順で重複除去する。
- VS Code の所属 API を使用し、外部フォルダ・仮想 URI・diff・画像等を除外する。
- 対象となる実際のアクティブテキストタブだけに URI と `selection.active` の座標を付ける。
- dirty な対象ファイルの URI を記録し、untitled は一時的な件数だけを返す。本文を取得・保存しない。
- 取得は同期的な1回の読取で、購読や自動記録、ソースへの書込、Git 実行を行わない。

## 単体 TDD の実行証跡

各行の RED はテストを先に追加して実行した assertion の失敗。GREEN の後に `npm run verify`（型・全単体・ビルド）を実行し、その小さい完了単位でコミットした。

| ID / ふるまい | 実際の RED | GREEN / 回帰 |
| --- | --- | --- |
| P1-07a: 2タブとアクティブ URI / 座標 | `openFiles: []`、URI / cursor が null で期待値と不一致 | [RED](tdd-evidence/s3/P1-07a-red.log) / [GREEN](tdd-evidence/s3/P1-07a-green.log) / [回帰77件](tdd-evidence/s3/P1-07a-verify.log) |
| P1-08a: グループ間の URI 重複除去 | 期待2件に対して同じ URI が重複した3件 | [RED](tdd-evidence/s3/P1-08a-red.log) / [GREEN](tdd-evidence/s3/P1-08a-green.log) / [回帰79件](tdd-evidence/s3/P1-08a-verify.log) |
| P1-08b: ローカル所属判定と除外件数 | 外部 / 別ワークスペース / 仮想 / remote URI が含まれる。特殊タブの除外件数が0 | [RED](tdd-evidence/s3/P1-08b-red.log) / [GREEN](tdd-evidence/s3/P1-08b-green.log) / [回帰84件](tdd-evidence/s3/P1-08b-verify.log) |
| P1-08c: アクティブタブの適格性 | 特殊タブ・不一致・対象外の場合も activeFileUri が残る | [RED](tdd-evidence/s3/P1-08c-red.log) / [GREEN](tdd-evidence/s3/P1-08c-green.log) / [回帰87件](tdd-evidence/s3/P1-08c-verify.log) |
| P1-08d: 保存スキーマに適合する URI | query / fragment 付きの file URI が含まれ、後続の保存検証で拒否され得る | [RED](tdd-evidence/s3/P1-08d-red.log) / [GREEN](tdd-evidence/s3/P1-08d-green.log) / [回帰93件](tdd-evidence/s3/P1-08d-verify.log) |
| P1-09a: 本文なしの dirty URI | 期待1件に対して空配列 | [RED](tdd-evidence/s3/P1-09a-red.log) / [GREEN](tdd-evidence/s3/P1-09a-green.log) / [回帰88件](tdd-evidence/s3/P1-09a-verify.log) |
| P1-09b: untitled の件数のみ | dirty 有無とも untitled 件数が期待1に対して0 | [RED](tdd-evidence/s3/P1-09b-red.log) / [GREEN](tdd-evidence/s3/P1-09b-green.log) / [回帰90件](tdd-evidence/s3/P1-09b-verify.log) |

実行コマンドは `npm run test:unit -- tests/editorCapture.test.ts -t <ID>`。全コマンドの出力は各ログに保存している。`-t` で選ばれなかったケースがログ上 skipped となるのは絞込実行のためで、ソースの `.skip` ではない。全回帰では選択除外を行っていない。

空のエディタ領域と、返却した座標・配列を変更しても入力が変わらないことは既存挙動に対する保護テストであり、新規 RED/GREEN として数えていない。特殊タブの URI 自体は型の絞込のため最初の実装から除外されていた。P1-08b の特殊タブに関する RED は警告件数の不足である。P1-09a の本文 getter ガードも、本文を読んでいた不具合の再現と主張しない。

## 実 VS Code API の RED / GREEN

API アダプタを空のメタデータを返すスタブとして追加し、実際に2タブを開く統合テストを先に push した。型・単体の成功だけで API 検証完了とは扱っていない。

- RED: コミット `ba80c6c` の [CI 41565997052](https://github.com/taku0193/resumeflow/actions/runs/41565997052/job/125687558173)。`xvfb-run -a npm run test:integration` で既存6件成功 / 新規1件失敗。空配列と null が実際に開いた URI / カーソルと不一致だった。起動・import の失敗ではない。[原文のテスト出力抜粋](tdd-evidence/s3/api-red-CI.excerpt.log)
- GREEN: コミット `0ba0c1e` の [CI 41566203794](https://github.com/taku0193/resumeflow/actions/runs/41566203794)。アダプタ実装後、API 統合7件・単体91件・UI E2E 1件の全ジョブが成功。
- 追加の API 保護テスト8件: 空のエディタ、複数グループの同じファイル、接頭辞が似た外部ディレクトリ、仮想ドキュメント、別グループに同じファイルがある diff、実画像エディタ、dirty 本文不保存・ソース不変、untitled 非永続化。先行する単体 TDD の契約を実 API と組み合わせた検証で、個別の新規 RED/GREEN として数えない。

### 画像テストの前提の修正

追加 API ケースの初回 [CI 41566414977](https://github.com/taku0193/resumeflow/actions/runs/41566414977) は14件成功 / 1件失敗。画像タブが `TabInputCustom` になると仮定したテストの待機が期限切れになった。[失敗出力](tdd-evidence/s3/image-fixture-first-failure-CI.excerpt.log)

診断を追加した [CI 41566815578](https://github.com/taku0193/resumeflow/actions/runs/41566815578) で、`pixel.png` 自体は開いており、CI の組み込み画像エディタでは input が undefined で、従来の media-preview 拡張も存在しないことを確認した。[診断出力](tdd-evidence/s3/image-fixture-diagnostics-CI.excerpt.log)。インストール済み VS Code のコードを読取確認し（起動はしていない）、ネイティブの画像入力があることも確認した。

テストの準備確認を、実画像タブが開き通常の `TabInputText` ではないことへ修正した。保存対象・アクティブ URI・カーソルが空、除外件数が1という製品側の期待値は維持した。アダプタの判定と待機期限は変更していない。[CI 41567062936](https://github.com/taku0193/resumeflow/actions/runs/41567062936) で統合15件が成功。これはテスト準備の修正であり、製品の新しい RED/GREEN と数えない。

## 回帰と境界

モデル、純粋サービス、VS Code アダプタを分離し、URI と座標を明示的にコピーする構成を最初から採用した。最初の [回帰](tdd-evidence/s3/core-regression.log) と [coverage](tdd-evidence/s3/core-coverage.log) は91件成功。

レビュー時に、scheme と所属だけでは query / fragment 付き URI を取得し、S2 の保存スキーマに違反し得る点を P1-08d の RED で確認した。REFACTOR として既存の URI 検証を `models/fileUri.ts` へ移し、取得と保存で同じ規則を使うようにした。既存の保存規則は変えていない。[最終回帰](tdd-evidence/s3/P1-08d-verify.log) と [最終 coverage](tdd-evidence/s3/final-coverage.log) は93件成功。models / services の実行コード6ファイルで statements / branches / functions / lines は100%。アダプタ・UI の網羅率を表す数字ではない。

[配布対象検査](tdd-evidence/s3/package.log) では実 VSIX を作成し、runtime / README / package の12ファイルのみを許可した（VSIX メタデータ込み14ファイル）。テスト、架空本文、プロファイル、依存ツールは含まれない。

所属判定は URI 上の所属であり、S3 ではシンボリックリンクの実体を解決しない。ファイルを開く際の再検証は S8。保存コマンド・UI の警告表示は S5 / S6、未保存警告の UI E2E は E2E-04 として追跡する。今回の UI E2E は E2E-00 の回帰であり、保存・再開操作の完成ではない。

最終の製品コード `0bbbb68` の [CI 41567531558](https://github.com/taku0193/resumeflow/actions/runs/41567531558) は単体93件・統合15件・UI E2E 1件を含む全ジョブが成功した。Windows / macOS の実 GUI と最小 VS Code バージョンは未検証。

作業中のユーザー指示で、今後は CLI / Codex 単体で使える構成を優先し、Issue 起点で開発する方針になった。[親 Issue #4](https://github.com/taku0193/resumeflow/issues/4) と [仕様 Issue #5](https://github.com/taku0193/resumeflow/issues/5) で追跡する。従来 S4 / P1-10〜13 の Git 取得・解析は共通コアとしてロードマップに引き継ぐ。エディタ対応先の選定は保留。
