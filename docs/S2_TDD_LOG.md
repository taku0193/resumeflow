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
