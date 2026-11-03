# README design notes — Issue #25

## Direction

ResumeFlowの「中断した作業の続きへ戻る」を、生成りの紙面・墨色・朱色のフロー図で表現する。横長では3工程を左から右へ、狭い画面では縦に読める図へ切り替える。save→PC内のcheckpoints.json→context→新しいチャット、という実装済みの流れと、記録する項目を日本語で説明する。

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

- GitHub Markdown APIのGFM出力を使い、GitHub Markdown CSSを用いたローカルプレビューで確認した。GitHub本体のUIを自動操作した結果ではない。
- アプリ内ブラウザの1280px幅（明/暗）と390px幅で確認。画像5件の読込成功、ページ全体の横はみ出し0、目次リンクの参照先欠損0。390pxでは縦型の図に切り替わる。
- READMEのローカルリンク・画像参照11件の実在を確認。
- `npm run test:cli:e2e` は13件成功、skip/failともに0。配布物の別場所へのオフラインインストールも含む。
- `npm run test:e2e:package` はVSIXの許可リストと作成に成功。今回の図版4ファイル（SVG原本2件、PNG表示用2件）を許可リストへ明示した。
- 最初のSVG参照はVSIX作成時に `SVGs are restricted in README.md` で失敗した。SVGを原本として保持し、READMEの表示参照をPNGへ変更して成功した。製品機能のREDとして数えない。
- Playwright CLIは既定キャッシュの書込制限、続いてローカルChromeのSIGABRTで実行できなかった。ブラウザ表示の検証はアプリ内ブラウザに切り替えた。ローカルVS Codeは起動していない。

## Artwork export

編集用SVGから表示用PNGを2倍の幅で書き出す。日本語を表示できるシステムフォントを用意する。PNGは書き出した結果をリポジトリに含めるため、閲覧時にフォントや変換ツールは不要。以下は図版の編集作業用であり、製品の実行時依存には追加していない。

```bash
npx --yes --package @resvg/resvg-js-cli@2.6.2-beta.1 resvg-js-cli --fit-width 2400 --language ja docs/assets/resumeflow-hero.svg docs/assets/resumeflow-hero.png
npx --yes --package @resvg/resvg-js-cli@2.6.2-beta.1 resvg-js-cli --fit-width 1280 --language ja docs/assets/resumeflow-flow-mobile.svg docs/assets/resumeflow-flow-mobile.png
```

描画ツール: [resvg-js-cli](https://github.com/Zhengqbbb/resvg-js-cli)。プレビュー用CSS: [github-markdown-css](https://github.com/sindresorhus/github-markdown-css)。プレビュー環境と画像出力ツールは製品パッケージに含めない。
