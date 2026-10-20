# ER図

各テーブルの詳しい定義は [db.md](db.md) を参照してください。

> 静的版（リポジトリ直下の `index.html`）は DB を使いません。Next.js 版（`api-server/`）はこの設計どおりのテーブルを Neon（PostgreSQL）に作り、Prisma で読み書きしています。
> この図は、そのテーブルの構造です。

```mermaid
erDiagram
    sources ||--|{ source_sections : "章を持つ"
    source_sections ||--o{ questions : "出典になる"
    questions ||--|{ choices : "選択肢を4つ持つ"
    users |o--o{ play_sessions : "挑戦する"
    play_sessions ||--o{ session_answers : "回答を持つ"
    questions ||--o{ session_answers : "出題される"
    choices |o--o{ session_answers : "選ばれる"

    sources {
        bigint id PK "資料ID"
        varchar file_name UK "ファイル名"
        varchar title "タイトル"
        timestamptz created_at "作成日時"
        timestamptz updated_at "更新日時"
    }

    source_sections {
        bigint id PK "章ID"
        bigint source_id FK "資料ID"
        smallint section_no "章番号"
        varchar title "見出し"
        timestamptz created_at "作成日時"
        timestamptz updated_at "更新日時"
    }

    questions {
        bigint id PK "問題ID"
        bigint source_section_id FK "出典の章ID"
        smallint question_no "問題番号"
        text body "問題文"
        text quote "資料からの引用文"
        timestamptz created_at "作成日時"
        timestamptz updated_at "更新日時"
        timestamptz deleted_at "論理削除日時"
    }

    choices {
        bigint id PK "選択肢ID"
        bigint question_id FK "問題ID"
        smallint choice_no "1=A 2=B 3=C 4=D"
        varchar body "選択肢の文言"
        boolean is_correct "正解か"
        timestamptz created_at "作成日時"
        timestamptz updated_at "更新日時"
    }

    play_sessions {
        bigint id PK "挑戦ID（内部用）"
        uuid public_id UK "外部公開用の挑戦ID"
        bigint user_id FK "利用者ID"
        smallint choice_count "3 または 4"
        timestamptz finished_at "終了日時"
        timestamptz created_at "開始日時"
        timestamptz updated_at "更新日時"
    }

    users {
        bigint id PK "利用者ID"
        varchar email UK "メールアドレス（小文字）"
        varchar password_hash "パスワードのハッシュ"
        timestamptz created_at "登録日時"
        timestamptz updated_at "更新日時"
    }

    session_answers {
        bigint play_session_id PK, FK "挑戦ID"
        smallint order_no PK "出題順"
        bigint question_id FK "問題ID"
        bigint selected_choice_id FK "選んだ選択肢ID"
        timestamptz answered_at "回答日時"
        timestamptz created_at "作成日時"
        timestamptz updated_at "更新日時"
    }
```

## 読み方

| 記号 | 意味 |
| --- | --- |
| `\|\|--\|{` | 1 対 1以上（例：資料には章が1つ以上ある） |
| `\|\|--o{` | 1 対 0以上（例：まだ一度も出題されていない問題もある） |
| `\|o--o{` | 0か1 対 0以上（例：回答は未回答のあいだ選択肢を持たない） |

## まとめ

- **問題データ**（`sources` → `source_sections` → `questions` → `choices`）
  資料の章から問題を作り、1問に4つの選択肢をぶら下げます。4つ目は4択のときだけ使うダミーで、正解は必ず A〜C に置きます。
  出題をやめる問題は `deleted_at` で論理削除します。
- **プレイデータ**（`play_sessions` → `session_answers`）
  1回の挑戦ごとに、選んだ択数・シャッフル後の出題順・選んだ答えを記録します。
  正誤と正解数は記録せず、選んだ選択肢の `is_correct` から毎回求めます。
- `session_answers` の (`question_id`, `selected_choice_id`) は、`choices` の (`question_id`, `id`) への複合外部キーです。出題した問題の選択肢しか選べないことを DB が保証します。
