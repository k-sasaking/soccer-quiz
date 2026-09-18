# サッカークイズ

`soccer_knowledge.md` の内容から作った3択／4択クイズ（全10問）を、ブラウザで解けるようにした Next.js + shadcn/ui 製のページです。

## 公開ページ

https://k-sasaking.github.io/soccer-quiz/

## 開発

```bash
npm install
npm run dev
```

http://localhost:3000 で確認できます。

## ビルド（静的書き出し）

```bash
npm run build
```

`out/` に静的ファイルが出力されます。GitHub Pages のようにサブパス配下で公開するときは `BASE_PATH` を指定します。

```bash
BASE_PATH=/soccer-quiz npm run build
```

`main` に push すると GitHub Actions（`.github/workflows/deploy.yml`）が自動でビルドして GitHub Pages に公開します。
リポジトリの Settings → Pages で Source を「GitHub Actions」にしておいてください。

## お問い合わせページ

`/contact/` にお問い合わせフォームがあります。サーバーを持たない静的サイトのため、送信ボタンを押すと入力内容を本文にしたメールがメールソフトで開く仕組みです。

送信先メールアドレスはビルド時に `NEXT_PUBLIC_CONTACT_EMAIL` で指定します。

```bash
NEXT_PUBLIC_CONTACT_EMAIL=you@example.com npm run build
```

GitHub Pages に公開する場合は、リポジトリの Settings → Secrets and variables → Actions → Variables に `CONTACT_EMAIL` を登録してください。未設定のときはフォーム上部に注意が表示されます。

## ファイル

| ファイル | 内容 |
| --- | --- |
| `app/layout.tsx` | ページ全体の骨組みとメタ情報 |
| `app/page.tsx` | トップページ（クイズ本体を表示） |
| `app/contact/page.tsx` | お問い合わせページ（`/contact/`） |
| `app/globals.css` | Tailwind CSS と shadcn/ui のテーマ（黒基調・スマホ対応） |
| `components/Quiz.tsx` | スタート／問題／結果の3画面を切り替える |
| `components/StartScreen.tsx` | スタート画面（3択／4択を選ぶ） |
| `components/QuizScreen.tsx` | 問題画面（1画面1問、回答後に正解と解説） |
| `components/ResultScreen.tsx` | 結果画面（正解数・正答率・振り返り） |
| `components/ContactForm.tsx` | お問い合わせフォーム（入力内容をメールソフトに引き渡す） |
| `components/ui/` | shadcn/ui のコンポーネント（Button / Card / RadioGroup / Progress / Badge / Separator） |
| `components.json` | shadcn/ui の設定（`npx shadcn add <name>` でコンポーネントを追加） |
| `data/quiz.ts` | クイズ10問のデータとシャッフル処理 |
| `クイズ.md` | クイズの元データ（問題・正解・解説） |
| `soccer_knowledge.md` | クイズの出典となる資料 |

## 仕様

- 1画面に1問ずつ表示します
- スタート画面で3択か4択かを選べます
- 出題順は毎回シャッフルされます
- 答えを選ぶまで、正解も解説も表示しません
- 回答すると正誤の判定と、資料の出典つきの解説が出ます
- 1 / 2 / 3 / 4 キーでも回答できます
- 最後に正解数・正答率と全10問の振り返りを表示します

## クイズ内容を変更するとき

出題データは `data/quiz.ts` の `QUIZ` 配列に直接書いています。`クイズ.md` を更新したときは `data/quiz.ts` も合わせて直してください。
