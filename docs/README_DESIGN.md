# README design notes — Issue #25

## Direction

ResumeFlowの「中断した作業の続きへ戻る」を、ネイビー・ミント・余白とsave→contextの流れで表現する。英語の短いコピーと日本語の操作説明を組み合わせ、ブランド→試す→普段の利用→保存契約→開発資料の順に読む構成とする。

ヒーローSVGはこのリポジトリ用に制作した。外部の画像・ロゴ・文章は転載しない。アプリ画面や実測結果のスクリーンショットとは扱わず、画像内とalt/descでワークフローの図と明示する。スクリプト・外部フォント・外部画像を含めない。

## References reviewed

| Source | Adopted principle |
| --- | --- |
| [taku0193/thesis_app — THETIS](https://github.com/taku0193/thesis_app/blob/main/README.md) | 自作SVG、中央の短いコピー、セクションへの導線、詳細の折り畳み |
| [taku0193/pulse-air-macos](https://github.com/taku0193/pulse-air-macos/blob/main/README.md) | 一目で用途が分かる見出し、抑えたバッジ、実行時依存とプライバシーの明示 |
| [taku0193/rhythm-game — RHYTHM VISION](https://github.com/taku0193/rhythm-game/blob/main/README.md) | 英語のタイトルと日本語の説明、特徴を比較できる表、Quick Start |
| [charmbracelet/gum](https://github.com/charmbracelet/gum/blob/main/README.md) | ブランドの印象と、使う場面を先に伝える構成 |
| [astral-sh/uv](https://github.com/astral-sh/uv/blob/main/README.md) | 短い導入、早い段階で実行できるコマンド、機能と詳細資料の分離 |
| [starship/starship](https://github.com/starship/starship/blob/main/README.md) | 中央揃えのビジュアル・ナビゲーション、長い説明を折り畳む情報設計 |

2026-11-03に既定ブランチのREADMEをGitHub接続で読んだ。参考にしたのは構成・情報の優先順位であり、各プロジェクトの仕様や利用条件をResumeFlowに流用しない。

## Accuracy and distribution

- npm公開、ライセンス、ダウンロード数、未実装のUIに関するバッジを作らない。
- CIの3OSは検証環境を示し、常にgreenであると見せる静的ステータスは付けない。
- 操作には現在の `npm run cli --` / `node dist/cli/main.js` を使い、未登録のグローバルコマンドを前提にしない。
- Codex skillは同梱であり、ユーザー環境に導入済みとは書かない。
- SVGをnpmとVSIXの許可リストに含め、配布READMEの相対画像参照を保持する。
- 文書と図版の整備に製品機能の架空のRED/GREENを付けない。既存の配布・CLI受入テストを使う。

## Validation

表示・リンク・配布対象の実行結果を、完了時にこの節へ追記する。
