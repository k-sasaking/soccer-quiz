// 初期データ（prisma/seed-data.ts）を DB に入れる。何度実行しても同じ状態になる。
// 使い方: npm run db:seed
//
// 問題の内容が seed-data.ts と違うときの扱い（docs/db.md「過去の成績を変えないための決まり」）
// - 回答履歴がない問題 … 消して作り直す
// - 回答履歴がある問題 … 論理削除（deleted_at）して、新しい問題として作り直す
import "dotenv/config";
import { prisma } from "../lib/prisma";
import { questions, sections, source, type SeedQuestion } from "./seed-data";

type ActiveQuestion = Awaited<ReturnType<typeof loadActiveQuestions>>[number];

function loadActiveQuestions() {
  return prisma.question.findMany({
    where: { deletedAt: null },
    include: { choices: { orderBy: { choiceNo: "asc" } }, _count: { select: { sessionAnswers: true } } },
  });
}

function isSame(current: ActiveQuestion, seed: SeedQuestion, sourceSectionId: bigint): boolean {
  return (
    current.sourceSectionId === sourceSectionId &&
    current.body === seed.body &&
    current.quote === seed.quote &&
    current.choices.length === 4 &&
    current.choices.every((c, i) => c.choiceNo === i + 1 && c.body === seed.choices[i] && c.isCorrect === (i + 1 === seed.correctNo))
  );
}

async function main() {
  const src = await prisma.source.upsert({
    where: { fileName: source.fileName },
    update: { title: source.title },
    create: source,
  });

  const sectionIds = new Map<number, bigint>();
  for (const section of sections) {
    const row = await prisma.sourceSection.upsert({
      where: { sourceId_sectionNo: { sourceId: src.id, sectionNo: section.sectionNo } },
      update: { title: section.title },
      create: { sourceId: src.id, ...section },
    });
    sectionIds.set(section.sectionNo, row.id);
  }

  const active = await loadActiveQuestions();
  const counts = { created: 0, replaced: 0, unchanged: 0, retired: 0 };

  for (const [i, seed] of questions.entries()) {
    const questionNo = i + 1;
    const sourceSectionId = sectionIds.get(seed.sectionNo);
    if (sourceSectionId === undefined) throw new Error(`第${questionNo}問の章 ${seed.sectionNo} が sections にありません`);

    const current = active.find((q) => q.questionNo === questionNo);
    if (current && isSame(current, seed, sourceSectionId)) {
      counts.unchanged++;
      continue;
    }

    // 問題と選択肢4つは1つのトランザクションで入れる（コミット時に「4つ・正解1つ」が確認される）
    await prisma.$transaction(async (tx) => {
      if (current) {
        if (current._count.sessionAnswers > 0) {
          await tx.question.update({ where: { id: current.id }, data: { deletedAt: new Date() } });
        } else {
          await tx.question.delete({ where: { id: current.id } });
        }
      }
      await tx.question.create({
        data: {
          sourceSectionId,
          questionNo,
          body: seed.body,
          quote: seed.quote,
          choices: {
            create: seed.choices.map((body, j) => ({ choiceNo: j + 1, body, isCorrect: j + 1 === seed.correctNo })),
          },
        },
      });
    });
    if (current) counts.replaced++;
    else counts.created++;
  }

  // seed-data.ts から消えた番号の問題は出題をやめる（論理削除）
  const retired = await prisma.question.updateMany({
    where: { deletedAt: null, questionNo: { gt: questions.length } },
    data: { deletedAt: new Date() },
  });
  counts.retired = retired.count;

  console.log(
    `シード完了: 資料 1 / 章 ${sections.length} / 問題 ${questions.length}` +
      `（新規 ${counts.created}・作り直し ${counts.replaced}・変更なし ${counts.unchanged}・出題終了 ${counts.retired}）`,
  );
}

main()
  .catch((error) => {
    console.error("シードに失敗しました");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
