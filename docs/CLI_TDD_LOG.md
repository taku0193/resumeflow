# CLI / Codex 実装記録

各機能は Issue ごとのブランチで実装し、小さい検証済みの単位でコミットする。`docs/tdd-evidence/cli/` に実出力を保存している。絞込は `npm run test:unit -- <file> -t <ID>`、各 GREEN 後に `npm run verify` を実行する。実プロセスの CLI E2E、実 Git の Node 統合、VS Code API / UI の結果は区別する。

| Issue | 実装・TDD |
| --- | --- |
| #5 | CLI_SPEC.md にコマンド、スキーマ2、既定保存先、信頼条件、v1読取専用、受入条件を定義。文書変更に新規REDを付けない |
| #6 | C6-01 Node保存、02排他、03スキーマ、04旧データ読取、05追記/旧データ保護、06既定パス。それぞれassertion RED→GREEN。JSON I/O抽出は既存回帰によるrefactor |
| #7 | P1-10a 通常レコード、10b rename/copy、10c 不完全/無効出力がassertion RED→GREEN。P1-11の文字列保持は元から成立した保護テストで、新規REDではない |
| #8 | P1-12a〜d と C8-N1〜N3 がassertion RED→GREEN。未許可の非実行は最初からの保護で、新規REDと数えない。架空の実Gitでunborn/rename/detached/非Gitとindex/ソース不変を別途検証 |
| #9 | C9-01/02 引数、03レコード生成、04a help、04b保存、05プロジェクトと、CLI実プロセスの空スタブに対する失敗→接続後成功を記録 |

## C9-04c の記録上の訂正

最初のエラー系テストは `await` した例外が外へ出る形で失敗し、assertion形式のREDではなかった。実出力は `C9-04c-red.log` に保持している。テスト用補助スクリプトはこの出力を assertion RED と認めず非0を返したが、呼出側がその結果を止めずに実装へ進んだ。これは手順上の逸脱であり、正しい assertion RED の実施とは報告しない。

例外ハンドラ実装後に、テストを `expect(pending).resolves` で戻り値を確認する形式に補正した。型・全単体・ビルド・実プロセスの異常系で回帰確認する。以後は補助スクリプトの非0でコード変更を停止する。過去のログやコミットを書き換えていない。
