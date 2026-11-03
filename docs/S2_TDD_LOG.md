# S2: 保存データの検証と失敗時の保護

作業ブランチ: `codex/s2-storage-safety`。既存の開発ルール PR #1 の上に積む変更です。

## P1-04a: コレクションの構造

- 対応: SPEC §6、TEST_PLAN P1-04。
- RED: `npm run test:unit -- tests/checkpointStore.test.ts -t P1-04a`。null、配列、必須項目欠落、別バージョン、不正な checkpoints、未知の項目の6件が「reject するはずが resolve した」で失敗。
- GREEN: 同じコマンドで6件成功。
- REFACTOR: オブジェクトの必須項目・未知項目の判定を小さな共通関数に分離。追加の抽象化は不要と判断し、`npm run verify` で型チェック・全単体10件・ビルドを確認。
- 証跡: `docs/tdd-evidence/s2/P1-04a-{red,green,regression}.log`。
- 次: 各チェックポイント内部の型と必須項目。

ローカルの VS Code は起動しません。統合・実画面 E2E は PR の CI で検証します。

## P1-04b: 記録内部の必須項目・型

- RED: `npm run test:unit -- tests/checkpointStore.test.ts -t P1-04b`。必須項目欠落、メモや URI 配列の型、Git・カーソル内部の型、未知の本文・diff 項目など28件が resolve して失敗。
- GREEN: 同じコマンドで28件成功。
- REFACTOR: 文字列配列・nullable 文字列と、必須項目の判定を共通化して重複を抑制。初回の `npm run verify` はテストデータ生成の `.map` が可変長配列と推論されたため型チェックで失敗。単体28件の GREEN と、型チェック失敗を混同して成功と記載した点を訂正する。戻り値を2要素タプルとして明示し、後続サイクルで再検証する。
- 証跡: `docs/tdd-evidence/s2/P1-04b-{red,green,regression}.log`。
- 次: UUID・日時・URI・カーソル値・ID の重複など、型だけでは判定できないデータ契約。

## P1-04c: フィールドの値と参照関係

- RED: `npm run test:unit -- tests/checkpointStore.test.ts -t P1-04c`。不正な UUID・日時・URI・カーソル値、アクティブ URI の不一致、重複したタブ / ID の17件が resolve して失敗。既存の正しい nullable / OS 別 URI の4件は成功。
- GREEN: 同じコマンドで21件成功。
- REFACTOR: 構造の検証と値の検証を分け、URI・UTC 日時の判定を純粋関数化。P1-04b のテストデータのタプル型も修正し、`npm run verify` が型チェック・全単体59件・ビルドで成功。
- 証跡: `docs/tdd-evidence/s2/P1-04c-{red,green,regression}.log`。P1-04b の初回型エラーのログは上書きせず保持。
- 次: 書込直前の検証。

## P1-04d: 追記するデータも検証する

- RED: `npm run test:unit -- tests/checkpointStore.test.ts -t P1-04d`。未知の本文、無効 UUID、既存 ID の再利用の3件で、拒否すべき append が resolve して失敗。
- GREEN: 追記後のデータを同じスキーマ検証に通し、3件が成功。書込 I/O の呼出し0回と既存データ不変も確認。
- REFACTOR: 読込と書込で同じ検証を再利用。`npm run verify` の型チェック・全単体62件・ビルドが成功。
- 証跡: `docs/tdd-evidence/s2/P1-04d-{red,green,regression}.log`。
- 次: P1-05、破損 JSON の明確なエラーと上書き阻止。

## P1-05: 破損 JSON の保存保護

- RED: `npm run test:unit -- tests/checkpointStore.test.ts -t P1-05`。JSON 構文破損4件がネイティブ SyntaxError のままで `CheckpointError / INVALID_JSON` と一致せず失敗。スキーマ破損2件は既に拒否されて成功。
- 元データ不変・書込0回の保護自体は、構文エラーの場合も既存の JSON.parse の例外伝播で成立していた。今回の RED を「上書きが起きた」とは報告しない。
- GREEN: JSON 構文エラーを、本文を含まない日本語エラーと INVALID_JSON に変換。6件成功、load 失敗後の append でも元の文字列が完全一致し、書込 I/O は0回。
- 検証: `npm run verify` の型チェック・全単体68件・ビルドが成功。
- 証跡: `docs/tdd-evidence/s2/P1-05-{red,green,regression}.log`。
- 次: 純粋な JSON 読込処理の整理後、P1-06。

### P1-05 の整理

JSON の構文解析とスキーマ検証を `parseCheckpointCollection` にまとめ、ストレージ I/O から独立した純粋処理に移動。`npm run verify` が全単体68件・型チェック・ビルドで成功。`docs/tdd-evidence/s2/P1-05-refactor.log` に記録。

## P1-06: I/O 失敗を呼出し側へ伝える

- RED: `npm run test:unit -- tests/checkpointStore.test.ts -t P1-06`。read / write の例外が未分類の Error のままで、CheckpointError の READ_FAILED / WRITE_FAILED と一致せず2件失敗。
- GREEN: 読込 I/O と書込 I/O の境界でのみ例外を変換。2件成功。cause の保持、元データ不変、read 失敗時の書込0回、内部メッセージを公開エラーへ引用しないことを検証。
- REFACTOR: JSON / スキーマのエラー分類を I/O と分けて維持。`npm run verify` の型チェック・全単体70件・ビルドが成功。
- 証跡: `docs/tdd-evidence/s2/P1-06-{red,green,regression}.log`。
- 次: 実 VS Code I/O での破損保護・一時ファイル置換失敗の補完統合テスト、既存 E2E の回帰確認。

## P1-05-UTF8: 不正な UTF-8 バイトを置換して保存しない

- レビューで、従来の Buffer.toString は不正 UTF-8 を置換文字に変え、構造上は有効な JSON として読み書きできることを確認。既存の復号処理を小さな境界関数に抽出した後、先に破損バイトのテストを追加。
- RED: `npm run test:unit -- tests/checkpointEncoding.test.ts`。書込0回の期待に対し1回実行され、破損ファイルを再保存してしまうため1件失敗。正しい日本語と BOM の扱いの2件は成功。
- GREEN: fatal な UTF-8 復号に変更。読み取りを READ_FAILED として拒否し、元バイト列を保持。3件成功。
- REFACTOR: 復号を VS Code に依存しない純粋な境界関数に維持。BOM は除去せず、JSON の厳密な構文検査も維持。`npm run verify` の型チェック・全単体73件・ビルドが成功。
- 証跡: `docs/tdd-evidence/s2/P1-05-utf8-{red,green,regression}.log`。

## 補完検証

- 単体と拡張統合テストで架空のチェックポイント fixture を共有するよう配置を整理。
- 実 VS Code I/O に対し、JSON 構文破損・不正 UTF-8 のバイト保持と、置換失敗時の一時ファイル削除・既存対象保持の3件を追加。既存2件と合わせて統合テストは5件。実行は CI のみ。
- `npm run verify`: 型チェック・全単体73件・ビルドが成功。`final-verify.log` に保存。
- `npm run test:coverage`: models / services の4ファイルで statements / branches / functions / lines が100%。アダプタや UI の網羅率を意味しない。`final-coverage.log` に保存。
- `npm run test:e2e:package`: 9個の配布対象ファイルを検査して VSIX 作成が成功。テスト fixture や開発用データは含まない。`final-package.log` に保存。
- 保存 UI が未実装のため、E2E-11 / 12 は引き続き S6 で接続する。今回の CI は既存のパッケージ・画面表示 E2E-00 の回帰確認も実行する。

## P1-04e: 欠損要素のある配列を保存しない

- 最終レビューで、Array.every / forEach が配列の欠損要素を飛ばすため、検証後に JSON.stringify が null を書ける経路を発見。
- RED: `npm run test:unit -- tests/checkpointStore.test.ts -t P1-04e`。openFiles / unsavedFileUris / Git changes の3件で、書込0回の期待に対して1回書き込まれて失敗。
- GREEN: 文字列配列は Array.from、記録・Git changes は entries の走査で欠損位置も検証し、3件成功。
- REFACTOR / 回帰: 既存の検証境界を維持し、`npm run verify` の型チェック・全単体76件・ビルドが成功。
- 証跡: `docs/tdd-evidence/s2/P1-04e-{red,green,regression}.log`。

## P1-06 の実 FS 置換失敗を CI で検証

- RED: CI [41563238410](https://github.com/taku0193/resumeflow/actions/runs/41563238410) の `npm run test:integration` は4件成功・1件失敗。既存の非空ディレクトリを置換せず拒否するはずが、workspace.fs.rename の overwrite が成功してしまい `Missing expected rejection` で失敗した。
- 修正: ローカル一時ファイルの置換を `node:fs/promises.rename` へ変更。通常ファイルを置換でき、ディレクトリ対象ではエラーになる [Node.js の仕様](https://nodejs.org/api/fs.html#fsrenameoldpath-newpath-callback) に従う。一時ファイルの後始末と元の例外の伝播は維持。
- 補完: 既存の正しい JSON ファイルへの再保存でも2件の記録が残るテストを追加。統合は合計6件。ローカル GUI は起動せず、修正版の GREEN は CI で確認する。

## 追加レビュー後のローカル検証

`npm run verify` は型チェック・単体76件・ビルドで成功。`npm run test:coverage` は models / services の statements / branches ともに100%。`review-verify.log` / `review-coverage.log` に保存しました。実 FS の置換を含む統合6件と、既存の画面 E2E 1件の最終結果は [PR #2](https://github.com/taku0193/resumeflow/pull/2) の CI で確認します。
