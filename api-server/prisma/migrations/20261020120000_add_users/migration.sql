-- AlterTable
ALTER TABLE "play_sessions" ADD COLUMN     "user_id" BIGINT;

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "play_sessions_user_id_idx" ON "play_sessions"("user_id");

-- AddForeignKey
ALTER TABLE "play_sessions" ADD CONSTRAINT "play_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ============================================================
-- ここから下は Prisma のスキーマでは書けない制約・トリガー
-- ============================================================

-- メールアドレスは小文字にそろえて保存する（大文字・小文字違いの重複登録を防ぐ）
ALTER TABLE "users" ADD CONSTRAINT "users_email_check" CHECK ("email" <> '' AND "email" = lower("email"));
ALTER TABLE "users" ADD CONSTRAINT "users_password_hash_check" CHECK ("password_hash" <> '');

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
