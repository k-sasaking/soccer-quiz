# サッカークイズ（Next.js 版）

[`docs/api.md`](../docs/api.md)（API設計書）の API と、その API からデータを取得して動くクイズ画面を Next.js で実装したものです。

- **データは Prisma（ORM）で Neon（PostgreSQL）に保存します。** 問題・選択肢・資料は DB から読み、挑戦と回答も DB に書き込みます。サーバーを再起動しても消えません。
- 画面（`app/page.tsx`）は問題・正解・解説・結果をすべて API から取得します。画面側には問題データを持ちません。
- **クイズはログインした人だけが遊べます。** メールアドレスとパスワードで登録・ログインします（next-auth）。挑戦は始めた本人しか操作できません。
- リポジトリ直下の `index.html` は従来どおり単体で動く静的版で、この API は使いません。

## 使い方

Node.js 20.9 以上が必要です。

```bash
npm install
```

`.env.example` をコピーして `.env` を作り、Neon の接続文字列と `NEXTAUTH_SECRET`（ログイン用の鍵）を入れます（`.env` は git に含めません）。

```bash
cp .env.example .env
```

`NEXTAUTH_SECRET` には、次のコマンドで作った値を入れます。

```bash
openssl rand -base64 32
```

DB につながるか確かめ、テーブルと初期データ（問題10問）を入れます。どちらも何度実行しても大丈夫です。

```bash
npm run db:check
```

```bash
npm run db:deploy
```

```bash
npm run db:seed
```

```bash
npm run dev
```

`http://localhost:3000/` を開くとログイン画面が表示されます。はじめは「新規登録」からメールアドレスとパスワードを登録してください。
`http://localhost:3000/api/v1/quiz` を開くと、問題数が JSON で返ります。

## コマンド

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発用サーバーを起動 |
| `npm run build` | 本番用にビルド |
| `npm start` | ビルドしたものを起動 |
| `npm test` | テストを実行（`.env.test` の DB を使う。下記「テスト」） |
| `npm run typecheck` | 型チェック |
| `npm run db:check` | Neon に Prisma でつながるか確かめる |
| `npm run db:generate` | `prisma/schema.prisma` から Prisma Client を作り直す（`npm install` 時にも自動で走る） |
| `npm run db:push` | スキーマをそのまま DB に反映する（開発用） |
| `npm run db:migrate` | マイグレーションを作って DB に反映する（開発用） |
| `npm run db:deploy` | まだ反映していないマイグレーションを DB に反映する（本番・テスト用） |
| `npm run db:seed` | 初期データ（`prisma/seed-data.ts`）を DB に入れる |
| `npm run db:studio` | DB の中身をブラウザで見る |

## 環境変数

| 名前 | 初期値 | 内容 |
| --- | --- | --- |
| `CORS_ALLOWED_ORIGINS` | `https://k-sasaking.github.io` | API を呼んでよい画面のオリジン（カンマ区切り） |
| `MAINTENANCE_MODE` | なし | `true` にすると、すべての API が `503` を返す |
| `DATABASE_URL` | なし（必須） | Neon の接続文字列。アプリ（Prisma Client）が使う。接続プーラー経由（ホスト名に `-pooler` が付くもの） |
| `DIRECT_URL` | なし | Neon の接続文字列。Prisma CLI（migrate / db push）が使う。プーラーを通さない直接接続。なければ `DATABASE_URL` を使う |
| `NEXTAUTH_SECRET` | なし（必須） | ログイン状態（Cookie の JWT）の署名・暗号化の鍵。`openssl rand -base64 32` で作る。変えると全員ログアウトされる |
| `NEXTAUTH_URL` | なし | このサーバーの URL（例：`https://quiz.example.com`）。本番では必ず https の URL を指定する |

`DATABASE_URL`・`DIRECT_URL`・`NEXTAUTH_SECRET`・`NEXTAUTH_URL` は `.env` に書きます（`.env.example` がひな形）。

## テスト

テストは本物の DB に読み書きし、毎回 `play_sessions` を全件消します。そのため本番とは別の DB を `.env.test` に書いて使います（書き方は `.env` と同じ）。
今は Neon の `test` ブランチを指しています。`.env.test` が `.env` と同じ DB を指していると、テストは実行前に止まります。
テストを始めるときに、テスト用 DB へマイグレーションと初期データの投入を自動で行います。
テストでは毎回 `users` も全件消し、テスト用の利用者を作ってログインした状態で API を呼びます（ログインの鍵はテスト専用の値。`vitest.config.mts`）。

## ファイル

| ファイル | 内容 |
| --- | --- |
| `app/page.tsx` / `app/quiz-app.tsx` | クイズ画面の入り口と、画面の状態管理（スタート／問題／結果） |
| `app/_components/*.tsx` | 各画面の部品（スタート画面・問題画面・結果画面・エラー表示） |
| `app/layout.tsx` / `app/globals.css` | 画面の骨組みと見た目（黒基調・スマホ対応。`style.css` を移植） |
| `lib/api-client.ts` | 画面から API を呼ぶ関数（fetch）とエラーの扱い |
| `app/api/v1/**/route.ts` | 各 API の入り口（URL とメソッドごと） |
| `lib/quiz-service.ts` | 各 API の中身（出題・回答・集計）。Prisma で DB を読み書きする |
| `prisma/schema.prisma` | DB のテーブル定義（`docs/db.md` に合わせたもの） |
| `prisma.config.ts` | Prisma CLI の設定（`.env` の読み込み、接続先） |
| `lib/prisma.ts` | Prisma Client（DB につなぐ窓口。1つだけ作って全ルートで共有） |
| `lib/generated/prisma/` | `prisma generate` が作るファイル（git に含めない） |
| `prisma/migrations/` | マイグレーション（テーブル・制約・トリガーを作る SQL） |
| `prisma/seed-data.ts` / `prisma/seed.ts` | 初期データと、それを DB に入れるスクリプト（`npm run db:seed`） |
| `scripts/check-db.ts` | DB 接続の確認（`npm run db:check`） |
| `lib/http.ts` | 全 API 共通の処理（エラーの形・X-Request-Id・ログ・Cache-Control・405） |
| `lib/rate-limit.ts` | 呼び出し回数の制限（429） |
| `lib/auth.ts` | ログインの設定（next-auth）と、API でログイン中の利用者を取り出す処理（401） |
| `lib/users.ts` | 利用者の登録と、メールアドレス・パスワードの照合 |
| `lib/password.ts` | パスワードのハッシュ化と照合（scrypt） |
| `app/api/auth/[...nextauth]/route.ts` | next-auth の API（ログイン・ログアウトなど） |
| `app/login/page.tsx` / `app/signup/page.tsx` / `app/_components/auth-form.tsx` | ログイン画面・新規登録画面 |
| `app/_components/user-bar.tsx` | ログイン中のメールアドレスとログアウトボタン |
| `types/next-auth.d.ts` | next-auth のセッションの型（利用者の ID を足す） |
| `lib/errors.ts` | エラーコード |
| `proxy.ts` | CORS |
| `tests/api.test.ts` | API のテスト |
| `tests/test-env.mts` / `tests/global-setup.mts` | テスト用 DB（`.env.test`）の読み込みと、テスト前の準備 |

## 問題データについて

`prisma/seed-data.ts` は、リポジトリ直下の `script.js` の `QUIZ` 配列を転記したものです。
問題を変えるときは、`クイズ.md`・`script.js`・`prisma/seed-data.ts` をそろえて直し、`npm run db:seed` を実行します。
回答履歴のある問題を変えると、古い問題は論理削除され、新しい問題として作り直されます（過去の成績は変わりません。`docs/db.md`「過去の成績を変えないための決まり」）。

`docs/db.md` の DDL にある CHECK 制約・部分インデックス・トリガーは Prisma のスキーマでは書けないため、最初のマイグレーション SQL の末尾に手で足してあります。
スキーマを変えたら `npm run db:migrate` で新しいマイグレーションを作って反映します。

## 画面と API の流れ

| 画面の操作 | 呼ぶ API |
| --- | --- |
| 新規登録 | `POST /api/v1/users` → next-auth でログイン |
| ログイン／ログアウト | next-auth（`/api/auth/*`） |
| 画面を開く | `GET /api/v1/quiz`（問題数・選べる択数） |
| スタート | `POST /api/v1/play-sessions` → `GET .../questions/1` |
| 選択肢を選ぶ | `PUT .../questions/{orderNo}/answer`（ここで初めて正解・解説が返る） |
| 次の問題へ | `GET .../questions/{次のorderNo}` |
| 結果を見る | `PATCH /api/v1/play-sessions/{id}`（終了）→ `GET .../result` |

問題を取得する API は正解・解説を返さないため、回答するまで画面にも正解は出ません。
