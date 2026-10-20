# DB設計書

サッカークイズのデータ構造をまとめた設計書です。ER図は [er.md](er.md) を参照してください。

## 前提：現状の保存方法

現在のアプリは **DBを使っていません**。静的な HTML／CSS／JS だけで動いています。

| データ | 現状の置き場所 | 永続化 |
| --- | --- | --- |
| 資料 | `soccer_knowledge.md` | ファイル |
| 問題・選択肢・正解・解説 | `script.js` の `QUIZ` 配列（元データは `クイズ.md`） | ファイル |
| 出題順・選んだ答え・択数 | `script.js` の変数 `quizList` / `answers` / `choiceCount` | なし（ページを閉じると消える） |

この設計書は、上記のデータをそのまま DB のテーブルに置き換えた場合の設計です。
今のアプリの機能で扱っているデータだけを対象にしており、ユーザー登録などの新機能は含めていません。
DB は PostgreSQL（16 で動作確認済み）を想定しています。

## 設計方針

アプリの要件（`CLAUDE.md` / `README.md`）から、DB で守る方針を次のように決めています。

| 要件 | DB での守り方 |
| --- | --- |
| 資料に書いてあることだけから出題する | 問題は出典の章（`source_section_id`）を必須にする |
| 解説には資料のどこに書いてあるかを添える | 引用文（`quote`）と章を持ち、解説文はそこから組み立てる |
| 3択か4択かを選べる | 選択肢は常に4つ持ち、4つ目（D）は4択のときだけ使う。正解は必ず A〜C |
| 出題順はシャッフル | 挑戦ごとに出題順（`order_no`）を記録する |
| 最後に正解数・振り返りを表示する | 選んだ選択肢だけを記録し、正誤・正解数はそこから求める |

## 命名規則

| 対象 | 規則 | 例 |
| --- | --- | --- |
| テーブル名 | スネークケース・複数形 | `questions`, `play_sessions` |
| カラム名 | スネークケース・単数形 | `body`, `choice_count` |
| 主キー | `id`（中間的な記録テーブルは複合主キー） | `questions.id` |
| 外部公開用のID | `public_id`（`uuid`） | `play_sessions.public_id` |
| 外部キー | 参照先テーブルの単数形 + `_id` | `source_section_id`, `play_session_id` |
| 役割つきの外部キー | 役割 + 参照先の単数形 + `_id` | `selected_choice_id` |
| 番号・順番 | `_no` | `section_no`, `question_no`, `choice_no`, `order_no` |
| 件数 | `_count` | `choice_count` |
| 真偽値 | `is_` で始める | `is_correct` |
| 日時 | `_at` で終わる（`timestamptz`） | `created_at`, `answered_at` |
| 本文 | `body`、見出しは `title` | `questions.body`, `sources.title` |
| インデックス | `テーブル名_カラム名_idx`、一意なら `_key` | `questions_source_section_id_idx` |

`script.js` の項目名との対応は次のとおりです。

| `script.js` | DB |
| --- | --- |
| `QUIZ[].q` | `questions.body` |
| `QUIZ[].choices[i]` | `choices.body`（`choice_no = i + 1`） |
| `QUIZ[].answer` | `choices.is_correct`（`choice_no = answer + 1` の行が `true`） |
| `QUIZ[].explanation` | `questions.quote` ＋ `source_sections` ＋ `sources` から組み立て |
| `choiceCount` | `play_sessions.choice_count` |
| `quizList` の並び | `session_answers.order_no` |
| `answers[i]` | `session_answers.selected_choice_id` |

## テーブル一覧

| # | テーブル名 | 論理名 | 種類 | 役割 |
| --- | --- | --- | --- | --- |
| 1 | `sources` | 資料 | マスタ | クイズの出典となる資料 |
| 2 | `source_sections` | 資料の章 | マスタ | 解説で「どこに書いてあるか」を示す章 |
| 3 | `questions` | 問題 | マスタ | 問題文と資料からの引用文 |
| 4 | `choices` | 選択肢 | マスタ | 1問につき4つの選択肢 |
| 5 | `play_sessions` | 挑戦 | 記録 | 1回のプレイ（スタート〜結果） |
| 6 | `session_answers` | 回答 | 記録 | 挑戦ごとの出題順と選んだ答え |
| 7 | `users` | 利用者 | マスタ | ログインする人（メールアドレスとパスワードのハッシュ） |

全テーブル共通で `created_at` / `updated_at` を持ちます。`updated_at` はトリガーで自動更新します。

## テーブル定義

### 1. sources（資料）

| カラム名 | 型 | NULL | キー・制約 | 説明 |
| --- | --- | --- | --- | --- |
| `id` | `bigint` IDENTITY | NOT NULL | PK | 資料ID |
| `file_name` | `varchar(255)` | NOT NULL | UNIQUE | ファイル名（例：`soccer_knowledge.md`） |
| `title` | `varchar(255)` | NOT NULL | | 資料のタイトル（例：「サッカークイズ用 Knowledge」） |
| `created_at` | `timestamptz` | NOT NULL | 初期値 `now()` | 作成日時 |
| `updated_at` | `timestamptz` | NOT NULL | 初期値 `now()` | 更新日時 |

### 2. source_sections（資料の章）

| カラム名 | 型 | NULL | キー・制約 | 説明 |
| --- | --- | --- | --- | --- |
| `id` | `bigint` IDENTITY | NOT NULL | PK | 章ID |
| `source_id` | `bigint` | NOT NULL | FK → `sources.id` | どの資料の章か |
| `section_no` | `smallint` | NOT NULL | `>= 1` | 章番号（例：`1`） |
| `title` | `varchar(255)` | NOT NULL | | 章の見出し（例：「サッカーの基本ルール」） |
| `created_at` | `timestamptz` | NOT NULL | 初期値 `now()` | 作成日時 |
| `updated_at` | `timestamptz` | NOT NULL | 初期値 `now()` | 更新日時 |

- 一意制約：(`source_id`, `section_no`)

### 3. questions（問題）

| カラム名 | 型 | NULL | キー・制約 | 説明 |
| --- | --- | --- | --- | --- |
| `id` | `bigint` IDENTITY | NOT NULL | PK | 問題ID |
| `source_section_id` | `bigint` | NOT NULL | FK → `source_sections.id` | 出典の章 |
| `question_no` | `smallint` | NOT NULL | `>= 1` | `クイズ.md` での問題番号（第1問＝`1`） |
| `body` | `text` | NOT NULL | 空文字不可 | 問題文 |
| `quote` | `text` | NOT NULL | 空文字不可 | 解説に使う資料からの引用文 |
| `created_at` | `timestamptz` | NOT NULL | 初期値 `now()` | 作成日時 |
| `updated_at` | `timestamptz` | NOT NULL | 初期値 `now()` | 更新日時 |
| `deleted_at` | `timestamptz` | NULL | | 論理削除した日時（出題中は `NULL`） |

- 部分一意インデックス：`(question_no) WHERE deleted_at IS NULL` … 出題中の問題どうしで番号が重ならない
- 解説の表示文は `quote` と、章・資料をたどって組み立てます。
  例：「{quote}」（{sources.file_name} 「{section_no}. {source_sections.title}」より）

### 4. choices（選択肢）

| カラム名 | 型 | NULL | キー・制約 | 説明 |
| --- | --- | --- | --- | --- |
| `id` | `bigint` IDENTITY | NOT NULL | PK | 選択肢ID |
| `question_id` | `bigint` | NOT NULL | FK → `questions.id` | どの問題の選択肢か |
| `choice_no` | `smallint` | NOT NULL | `1〜4` | 表示位置（`1`=A / `2`=B / `3`=C / `4`=D） |
| `body` | `varchar(255)` | NOT NULL | 空文字不可 | 選択肢の文言 |
| `is_correct` | `boolean` | NOT NULL | 初期値 `false` | 正解なら `true` |
| `created_at` | `timestamptz` | NOT NULL | 初期値 `now()` | 作成日時 |
| `updated_at` | `timestamptz` | NOT NULL | 初期値 `now()` | 更新日時 |

- 一意制約：(`question_id`, `choice_no`)
- 一意制約：(`question_id`, `id`) … `session_answers` からの複合外部キーの参照先
- CHECK：`NOT (is_correct AND choice_no = 4)` … 正解は必ず A〜C（D は4択用のダミー）
- 部分一意インデックス：`(question_id) WHERE is_correct` … 正解は1問に1つまで
- 制約トリガー：コミット時に「選択肢がちょうど4つ・正解がちょうど1つ」を確認
- 論理削除は持ちません。問題と一緒に扱います（理由は「論理削除」の節）。

### 5. play_sessions（挑戦）

| カラム名 | 型 | NULL | キー・制約 | 説明 |
| --- | --- | --- | --- | --- |
| `id` | `bigint` IDENTITY | NOT NULL | PK | 挑戦ID（DB内部だけで使う） |
| `public_id` | `uuid` | NOT NULL | UNIQUE、初期値 `gen_random_uuid()` | 外部公開用の挑戦ID（API の URL に使う） |
| `user_id` | `bigint` | NULL | FK → `users.id` | 挑戦した利用者（ログイン機能を入れる前の挑戦は `NULL`） |
| `choice_count` | `smallint` | NOT NULL | `3` か `4` | 選んだ択数 |
| `finished_at` | `timestamptz` | NULL | `>= created_at` | 結果画面を表示した日時（途中でやめたら `NULL`） |
| `created_at` | `timestamptz` | NOT NULL | 初期値 `now()` | スタートボタンを押した日時 |
| `updated_at` | `timestamptz` | NOT NULL | 初期値 `now()` | 更新日時 |

- 「もう一度挑戦する」を押すと、同じ `choice_count` で新しい行を作ります。
- 正解数は持たず、`session_answers` から集計します（「正規化」の節）。
- API には連番の `id` を出さず、推測できない `public_id` を使います。API は `user_id` が自分のものかも確かめますが、ID から挑戦の数や順番を読み取られないよう、連番は出しません（[api.md](api.md)）。
- `user_id` を NULL 可にしているのは、ログイン機能を入れる前の挑戦を消さずに残すためです。これらはだれのものでもないので、API からは操作できません。新しく作る挑戦には必ず入ります。

### 6. session_answers（回答）

| カラム名 | 型 | NULL | キー・制約 | 説明 |
| --- | --- | --- | --- | --- |
| `play_session_id` | `bigint` | NOT NULL | PK, FK → `play_sessions.id` | どの挑戦か |
| `order_no` | `smallint` | NOT NULL | PK, `>= 1` | その挑戦での出題順（第1問＝`1`） |
| `question_id` | `bigint` | NOT NULL | FK → `questions.id` | 出題した問題 |
| `selected_choice_id` | `bigint` | NULL | FK → `choices`（下記） | 選んだ選択肢（未回答なら `NULL`） |
| `answered_at` | `timestamptz` | NULL | | 回答した日時（未回答なら `NULL`） |
| `created_at` | `timestamptz` | NOT NULL | 初期値 `now()` | 作成日時 |
| `updated_at` | `timestamptz` | NOT NULL | 初期値 `now()` | 更新日時 |

- 主キー：(`play_session_id`, `order_no`)
- 一意制約：(`play_session_id`, `question_id`) … 1回の挑戦で同じ問題は1度だけ
- 複合外部キー：(`question_id`, `selected_choice_id`) → `choices (question_id, id)` … 出題した問題の選択肢しか選べない
- CHECK：`selected_choice_id` と `answered_at` は、両方 `NULL` か両方あり
- トリガー：3択の挑戦では D（`choice_no = 4`）を選べない
- スタート時に、シャッフルした順で全問ぶんの行を作ります（`selected_choice_id` は `NULL`）。回答したら `selected_choice_id` と `answered_at` を更新します。

### 7. users（利用者）

| カラム名 | 型 | NULL | キー・制約 | 説明 |
| --- | --- | --- | --- | --- |
| `id` | `bigint` IDENTITY | NOT NULL | PK | 利用者ID（DB内部とログインの JWT だけで使う） |
| `email` | `varchar(254)` | NOT NULL | UNIQUE、空でない、小文字だけ | メールアドレス（ログインに使う） |
| `password_hash` | `varchar(255)` | NOT NULL | 空でない | パスワードを scrypt でハッシュ化した値。形式は `scrypt$N$r$p$ソルト$ハッシュ` |
| `created_at` | `timestamptz` | NOT NULL | 初期値 `now()` | 登録日時 |
| `updated_at` | `timestamptz` | NOT NULL | 初期値 `now()` | 更新日時 |

- メールアドレスは小文字にそろえて保存します（CHECK `email = lower(email)`）。`Taro@example.com` と `taro@example.com` を別の人として登録できないようにするためです。
- パスワードそのものは保存しません。ハッシュにはソルトと計算の強さ（N, r, p）も含むので、あとで強さを上げても古いハッシュを照合できます。

## リレーション

| 親 | 子 | 多重度 | ON DELETE | 理由 |
| --- | --- | --- | --- | --- |
| `sources` | `source_sections` | 1 : 1以上 | `RESTRICT` | 問題の出典が消えるのを防ぐ |
| `source_sections` | `questions` | 1 : 0以上 | `RESTRICT` | 出典のない問題を作らない |
| `questions` | `choices` | 1 : 4 | `CASCADE` | 回答履歴のない問題を消すときは選択肢も一緒に消す |
| `users` | `play_sessions` | 0か1 : 0以上 | `CASCADE` | 利用者を消したら、その人の挑戦と回答も消す |
| `play_sessions` | `session_answers` | 1 : 0以上 | `CASCADE` | 挑戦を消したら回答も消す |
| `questions` | `session_answers` | 1 : 0以上 | `RESTRICT` | 回答履歴のある問題は物理削除しない |
| `choices` | `session_answers` | 0か1 : 0以上 | `RESTRICT` | 回答履歴のある選択肢は物理削除しない |

## 正規化とデータ整合性

### 第3正規形の確認

| テーブル | 確認結果 |
| --- | --- |
| `sources` / `source_sections` | 資料名は `sources` だけに持ち、章からは ID で参照する |
| `questions` | 解説文をそのまま持たず、引用文だけを持つ。資料名・章名は参照でたどる |
| `choices` | 正解は `is_correct` で持ち、問題側に「正解番号」を重ねて持たない |
| `play_sessions` | 正解数（score）は持たない。`session_answers` と `choices.is_correct` から求まる |
| `session_answers` | 正誤（is_correct）は持たない。`selected_choice_id` から求まる |

`session_answers.question_id` は、回答後は `selected_choice_id` からも求まります。ただし未回答の間も「どの問題を出したか」を持つ必要があるため残しています。
2つの値が食い違わないよう、複合外部キー (`question_id`, `selected_choice_id`) で DB が保証します。

### 過去の成績を変えないための決まり

正誤・正解数を記録せずに毎回求めるため、あとから問題や選択肢を書き換えると過去の成績まで変わってしまいます。これを防ぐために次のようにしています。

- **一度でも出題された問題・選択肢は中身を書き換えない。** トリガーで更新を拒否します。
- 直したいときは、元の問題を論理削除し、新しい問題として登録し直します。
- 論理削除（`deleted_at` の設定）は、出題済みでも行えます。

### DB で保証するルール

| ルール | 方法 |
| --- | --- |
| 資料・章・問題・選択肢の必須項目 | NOT NULL・空文字不可の CHECK |
| 1問に選択肢4つ・正解1つ | 部分一意インデックス ＋ 遅延制約トリガー |
| 正解は A〜C | CHECK |
| 択数は3か4 | CHECK |
| 選んだ選択肢は出題した問題のもの | 複合外部キー |
| 3択では D を選べない | トリガー |
| 回答と回答日時はセットで記録 | CHECK |
| 出題済みの問題・選択肢は書き換えない | トリガー |

アプリ側で確認すること：全問に回答してから `finished_at` を記録する。出題には `deleted_at IS NULL` の問題だけを使う。

## パフォーマンスとインデックス

### 主なクエリと使うインデックス

| 場面 | クエリの条件 | 使うインデックス |
| --- | --- | --- |
| スタート | `questions WHERE deleted_at IS NULL` | `questions_question_no_active_key`（部分インデックス） |
| 問題を表示 | `choices WHERE question_id = ? AND choice_no <= ? ORDER BY choice_no` | 一意制約 (`question_id`, `choice_no`) |
| 解説を表示 | `questions` → `source_sections` → `sources` を JOIN | 各テーブルの主キー |
| 挑戦を特定 | `play_sessions WHERE public_id = ? AND user_id = ?` | 一意制約 (`public_id`) |
| ログイン | `users WHERE email = ?` | 一意制約 (`email`) |
| 回答を記録 | `session_answers WHERE play_session_id = ? AND order_no = ?` | 主キー |
| 結果を表示 | `session_answers WHERE play_session_id = ? ORDER BY order_no` ＋ `choices`・`questions` を JOIN | 主キー |
| 出題済みか確認 | `session_answers WHERE question_id = ?`（書き換え防止トリガー） | `session_answers_question_choice_idx` |

### 外部キーのインデックス

PostgreSQL は外部キーに自動でインデックスを作らないため、次のように用意しています。

| 外部キー | インデックス |
| --- | --- |
| `source_sections.source_id` | 一意制約 (`source_id`, `section_no`) の先頭列で兼ねる |
| `questions.source_section_id` | `questions_source_section_id_idx` |
| `choices.question_id` | 一意制約 (`question_id`, `choice_no`) の先頭列で兼ねる |
| `play_sessions.user_id` | `play_sessions_user_id_idx` |
| `session_answers.play_session_id` | 主キーの先頭列で兼ねる |
| `session_answers.question_id` / `selected_choice_id` | `session_answers_question_choice_idx` (`question_id`, `selected_choice_id`) |

### JOIN の量と非正規化の判断

- 解説の表示には3テーブルの JOIN が要りますが、資料は1件・章は3件と小さく、主キーでたどるだけなので負担になりません。解説文を問題に丸ごと持たせる非正規化は、章名を直したときに全問の修正が必要になるため採用しません。
- 結果画面の正解数も、1回の挑戦で10行を集計するだけです。`score` を持たせると、回答の更新とのずれ（更新異常）が起こりうるため持たせません。
- 挑戦の件数が非常に多くなり、全体の集計（例：問題ごとの正答率）が重くなった場合は、集計用のテーブルやマテリアライズドビューを別に作ります。元のテーブルには冗長な列を足しません。

## 拡張性と運用

### タイムスタンプ

- 全テーブルに `created_at` / `updated_at` を持ちます。`updated_at` は `set_updated_at()` トリガーで自動更新するため、アプリで更新し忘れることはありません。
- `play_sessions` の開始日時は `created_at` を使います（同じ意味の列を2つ持たないため）。

### 論理削除

| テーブル | 論理削除 | 理由 |
| --- | --- | --- |
| `questions` | あり（`deleted_at`） | 出題をやめても、過去の回答履歴から参照され続けるため |
| `choices` | なし | 問題と一体なので、問題の `deleted_at` で扱う |
| `sources` / `source_sections` | なし | 問題から参照されるため物理削除はできない（`RESTRICT`）。資料を使わなくなったら、その問題を論理削除する |
| `play_sessions` / `session_answers` | なし | 記録データなので削除フラグは持たない。保存期間を決めて古いものを物理削除する（回答は `CASCADE` で一緒に消える） |

削除フラグは `boolean` ではなく `deleted_at`（日時）にしています。いつ削除したかも分かるためです。

### ログ・履歴

- **プレイの記録**：`play_sessions` / `session_answers` そのものがプレイのログです。
- **問題の変更履歴**：問題は書き換えず「論理削除して新しく登録」するため、`created_at` / `deleted_at` をたどれば、いつどの問題が出題されていたかが分かります。そのため別の変更履歴テーブルは作りません。
- **誰が変更したか**：今のアプリには利用者や管理者の概念がないため、`created_by` などは持ちません。管理画面を作るときに、利用者テーブルと合わせて追加します。

## 画面とデータの対応

| 画面 | 読むデータ | 書くデータ |
| --- | --- | --- |
| スタート画面 | 出題中の `questions` の件数（「全10問」） | `play_sessions` を作成、`session_answers` を全問ぶん作成 |
| 問題画面 | `questions.body`、`choices`（`choice_no <= choice_count`） | なし |
| 回答後 | `choices.is_correct`、解説（`quote` ＋ 章 ＋ 資料） | `session_answers.selected_choice_id` / `answered_at` を更新 |
| 結果画面 | `session_answers` と `questions` / `choices`（正解数は集計） | `play_sessions.finished_at` を更新 |

正解数を求めるクエリの例：

```sql
SELECT count(*) FILTER (WHERE c.is_correct) AS score,
       count(*)                             AS total
FROM session_answers a
LEFT JOIN choices c ON c.id = a.selected_choice_id
WHERE a.play_session_id = $1;
```

## 初期データ

`クイズ.md` と `script.js` の `QUIZ` 配列から投入します。

| テーブル | 件数 | 内容 |
| --- | --- | --- |
| `sources` | 1 | `soccer_knowledge.md` |
| `source_sections` | 3 | 1. サッカーの基本ルール / 2. FIFAワールドカップの歴史 / 3. 日本代表とワールドカップ |
| `questions` | 10 | 第1問〜第10問 |
| `choices` | 40 | 1問4つ × 10問 |

1問ぶんの問題と選択肢は、同じトランザクションで登録してください（コミット時に「選択肢4つ・正解1つ」を確認するため）。

## DDL

PostgreSQL 16 で実行し、上記の制約が効くことを確認済みです。

```sql
-- updated_at を自動で更新する
CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. 資料
CREATE TABLE sources (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  file_name  varchar(255) NOT NULL UNIQUE,
  title      varchar(255) NOT NULL,
  created_at timestamptz  NOT NULL DEFAULT now(),
  updated_at timestamptz  NOT NULL DEFAULT now()
);

-- 2. 資料の章
CREATE TABLE source_sections (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_id  bigint       NOT NULL REFERENCES sources (id) ON DELETE RESTRICT,
  section_no smallint     NOT NULL CHECK (section_no >= 1),
  title      varchar(255) NOT NULL,
  created_at timestamptz  NOT NULL DEFAULT now(),
  updated_at timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (source_id, section_no)
);

-- 3. 問題
CREATE TABLE questions (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_section_id bigint      NOT NULL REFERENCES source_sections (id) ON DELETE RESTRICT,
  question_no       smallint    NOT NULL CHECK (question_no >= 1),
  body              text        NOT NULL CHECK (body <> ''),
  quote             text        NOT NULL CHECK (quote <> ''),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);
CREATE UNIQUE INDEX questions_question_no_active_key ON questions (question_no) WHERE deleted_at IS NULL;
CREATE INDEX questions_source_section_id_idx ON questions (source_section_id);

-- 4. 選択肢
CREATE TABLE choices (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  question_id bigint       NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
  choice_no   smallint     NOT NULL CHECK (choice_no BETWEEN 1 AND 4),
  body        varchar(255) NOT NULL CHECK (body <> ''),
  is_correct  boolean      NOT NULL DEFAULT false,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (question_id, choice_no),
  UNIQUE (question_id, id),
  CHECK (NOT (is_correct AND choice_no = 4))
);
CREATE UNIQUE INDEX choices_correct_key ON choices (question_id) WHERE is_correct;

-- 7. 利用者（play_sessions から参照するので先に作る）
CREATE TABLE users (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         varchar(254) NOT NULL UNIQUE CHECK (email <> '' AND email = lower(email)),
  password_hash varchar(255) NOT NULL CHECK (password_hash <> ''),
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now()
);

-- 5. 挑戦
CREATE TABLE play_sessions (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id    uuid        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  user_id      bigint      REFERENCES users (id) ON DELETE CASCADE,
  choice_count smallint    NOT NULL CHECK (choice_count IN (3, 4)),
  finished_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (finished_at IS NULL OR finished_at >= created_at)
);
CREATE INDEX play_sessions_user_id_idx ON play_sessions (user_id);

-- 6. 回答
CREATE TABLE session_answers (
  play_session_id    bigint      NOT NULL REFERENCES play_sessions (id) ON DELETE CASCADE,
  order_no           smallint    NOT NULL CHECK (order_no >= 1),
  question_id        bigint      NOT NULL REFERENCES questions (id) ON DELETE RESTRICT,
  selected_choice_id bigint,
  answered_at        timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (play_session_id, order_no),
  UNIQUE (play_session_id, question_id),
  -- 選んだ選択肢が、出題した問題のものであることを保証する
  FOREIGN KEY (question_id, selected_choice_id) REFERENCES choices (question_id, id) ON DELETE RESTRICT,
  CHECK ((selected_choice_id IS NULL) = (answered_at IS NULL))
);
CREATE INDEX session_answers_question_choice_idx ON session_answers (question_id, selected_choice_id);

CREATE TRIGGER sources_set_updated_at         BEFORE UPDATE ON sources         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER source_sections_set_updated_at BEFORE UPDATE ON source_sections FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER questions_set_updated_at       BEFORE UPDATE ON questions       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER choices_set_updated_at         BEFORE UPDATE ON choices         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER play_sessions_set_updated_at   BEFORE UPDATE ON play_sessions   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER session_answers_set_updated_at BEFORE UPDATE ON session_answers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER users_set_updated_at           BEFORE UPDATE ON users           FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3択の挑戦で D（4つ目）を選べないようにする
CREATE FUNCTION check_choice_within_count() RETURNS trigger AS $$
BEGIN
  IF NEW.selected_choice_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM choices c
    JOIN play_sessions s ON s.id = NEW.play_session_id
    WHERE c.id = NEW.selected_choice_id AND c.choice_no > s.choice_count
  ) THEN
    RAISE EXCEPTION 'choice_no exceeds choice_count of play_session %', NEW.play_session_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER session_answers_check_choice
  BEFORE INSERT OR UPDATE OF selected_choice_id ON session_answers
  FOR EACH ROW EXECUTE FUNCTION check_choice_within_count();

-- 出題済みの問題・選択肢は中身を書き換えない（過去の成績が変わるのを防ぐ）
CREATE FUNCTION forbid_edit_answered_question() RETURNS trigger AS $$
BEGIN
  IF (NEW.source_section_id, NEW.question_no, NEW.body, NEW.quote)
       IS DISTINCT FROM (OLD.source_section_id, OLD.question_no, OLD.body, OLD.quote)
     AND EXISTS (SELECT 1 FROM session_answers WHERE question_id = OLD.id) THEN
    RAISE EXCEPTION 'question % has answers; soft-delete it and insert a new one', OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER questions_forbid_edit
  BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION forbid_edit_answered_question();

CREATE FUNCTION forbid_edit_answered_choice() RETURNS trigger AS $$
BEGIN
  IF (NEW.question_id, NEW.choice_no, NEW.body, NEW.is_correct)
       IS DISTINCT FROM (OLD.question_id, OLD.choice_no, OLD.body, OLD.is_correct)
     AND EXISTS (SELECT 1 FROM session_answers WHERE question_id = OLD.question_id) THEN
    RAISE EXCEPTION 'question % has answers; its choices cannot be edited', OLD.question_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER choices_forbid_edit
  BEFORE UPDATE ON choices
  FOR EACH ROW EXECUTE FUNCTION forbid_edit_answered_choice();

-- 1問につき選択肢4つ・正解1つを、トランザクション終了時に確認する
CREATE FUNCTION check_question_choices() RETURNS trigger AS $$
DECLARE
  qid bigint;
  n_all int;
  n_correct int;
BEGIN
  IF TG_TABLE_NAME = 'questions' THEN
    qid := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    qid := OLD.question_id;
  ELSE
    qid := NEW.question_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM questions WHERE id = qid) THEN
    RETURN NULL; -- 問題ごと削除された
  END IF;
  SELECT count(*), count(*) FILTER (WHERE is_correct) INTO n_all, n_correct
  FROM choices WHERE question_id = qid;
  IF n_all <> 4 OR n_correct <> 1 THEN
    RAISE EXCEPTION 'question % must have 4 choices and 1 correct (has %, %)', qid, n_all, n_correct;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER choices_check_set
  AFTER INSERT OR UPDATE OR DELETE ON choices
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION check_question_choices();
CREATE CONSTRAINT TRIGGER questions_check_choice_set
  AFTER INSERT ON questions
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION check_question_choices();
```
