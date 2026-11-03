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
