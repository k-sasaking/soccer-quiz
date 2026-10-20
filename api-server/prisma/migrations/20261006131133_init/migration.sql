-- CreateTable
CREATE TABLE "sources" (
    "id" BIGSERIAL NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_sections" (
    "id" BIGSERIAL NOT NULL,
    "source_id" BIGINT NOT NULL,
    "section_no" SMALLINT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" BIGSERIAL NOT NULL,
    "source_section_id" BIGINT NOT NULL,
    "question_no" SMALLINT NOT NULL,
    "body" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "choices" (
    "id" BIGSERIAL NOT NULL,
    "question_id" BIGINT NOT NULL,
    "choice_no" SMALLINT NOT NULL,
    "body" VARCHAR(255) NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "choices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "play_sessions" (
    "id" BIGSERIAL NOT NULL,
    "public_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "choice_count" SMALLINT NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "play_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_answers" (
    "play_session_id" BIGINT NOT NULL,
    "order_no" SMALLINT NOT NULL,
    "question_id" BIGINT NOT NULL,
    "selected_choice_id" BIGINT,
    "answered_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_answers_pkey" PRIMARY KEY ("play_session_id","order_no")
);

-- CreateIndex
CREATE UNIQUE INDEX "sources_file_name_key" ON "sources"("file_name");

-- CreateIndex
CREATE UNIQUE INDEX "source_sections_source_id_section_no_key" ON "source_sections"("source_id", "section_no");

-- CreateIndex
CREATE INDEX "questions_source_section_id_idx" ON "questions"("source_section_id");

-- CreateIndex
CREATE UNIQUE INDEX "choices_question_id_choice_no_key" ON "choices"("question_id", "choice_no");

-- CreateIndex
CREATE UNIQUE INDEX "choices_question_id_id_key" ON "choices"("question_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "play_sessions_public_id_key" ON "play_sessions"("public_id");

-- CreateIndex
CREATE INDEX "session_answers_question_id_selected_choice_id_idx" ON "session_answers"("question_id", "selected_choice_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_answers_play_session_id_question_id_key" ON "session_answers"("play_session_id", "question_id");

-- AddForeignKey
ALTER TABLE "source_sections" ADD CONSTRAINT "source_sections_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_source_section_id_fkey" FOREIGN KEY ("source_section_id") REFERENCES "source_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "choices" ADD CONSTRAINT "choices_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_answers" ADD CONSTRAINT "session_answers_play_session_id_fkey" FOREIGN KEY ("play_session_id") REFERENCES "play_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_answers" ADD CONSTRAINT "session_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_answers" ADD CONSTRAINT "session_answers_question_id_selected_choice_id_fkey" FOREIGN KEY ("question_id", "selected_choice_id") REFERENCES "choices"("question_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- ここから下は docs/db.md の DDL にある、Prisma のスキーマでは書けない制約・トリガー
-- ============================================================

-- CHECK 制約
ALTER TABLE "source_sections" ADD CONSTRAINT "source_sections_section_no_check" CHECK ("section_no" >= 1);
ALTER TABLE "questions" ADD CONSTRAINT "questions_question_no_check" CHECK ("question_no" >= 1);
ALTER TABLE "questions" ADD CONSTRAINT "questions_body_check" CHECK ("body" <> '');
ALTER TABLE "questions" ADD CONSTRAINT "questions_quote_check" CHECK ("quote" <> '');
ALTER TABLE "choices" ADD CONSTRAINT "choices_choice_no_check" CHECK ("choice_no" BETWEEN 1 AND 4);
ALTER TABLE "choices" ADD CONSTRAINT "choices_body_check" CHECK ("body" <> '');
-- 正解は必ず A〜C（D は4択用のダミー）
ALTER TABLE "choices" ADD CONSTRAINT "choices_correct_not_d_check" CHECK (NOT ("is_correct" AND "choice_no" = 4));
ALTER TABLE "play_sessions" ADD CONSTRAINT "play_sessions_choice_count_check" CHECK ("choice_count" IN (3, 4));
ALTER TABLE "play_sessions" ADD CONSTRAINT "play_sessions_finished_at_check" CHECK ("finished_at" IS NULL OR "finished_at" >= "created_at");
ALTER TABLE "session_answers" ADD CONSTRAINT "session_answers_order_no_check" CHECK ("order_no" >= 1);
-- 選んだ選択肢と回答日時は、両方 NULL か両方あり
ALTER TABLE "session_answers" ADD CONSTRAINT "session_answers_answered_check" CHECK (("selected_choice_id" IS NULL) = ("answered_at" IS NULL));

-- 部分一意インデックス
-- 出題中の問題どうしで番号が重ならない
CREATE UNIQUE INDEX "questions_question_no_active_key" ON "questions" ("question_no") WHERE "deleted_at" IS NULL;
-- 正解は1問に1つまで
CREATE UNIQUE INDEX "choices_correct_key" ON "choices" ("question_id") WHERE "is_correct";

-- updated_at を自動で更新する
CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sources_set_updated_at         BEFORE UPDATE ON sources         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER source_sections_set_updated_at BEFORE UPDATE ON source_sections FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER questions_set_updated_at       BEFORE UPDATE ON questions       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER choices_set_updated_at         BEFORE UPDATE ON choices         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER play_sessions_set_updated_at   BEFORE UPDATE ON play_sessions   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER session_answers_set_updated_at BEFORE UPDATE ON session_answers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
