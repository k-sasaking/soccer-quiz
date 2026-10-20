"use client";

import { useEffect, useRef, useState } from "react";
import { LABELS, type ChoiceCount, type QuizItem } from "@/data/quiz";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

type Props = {
  quizList: QuizItem[];
  choiceCount: ChoiceCount;
  onFinish: (answers: number[]) => void;
};

export default function QuizScreen({ quizList, choiceCount, onFinish }: Props) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null); // 回答済みなら選択肢を押せない
  const nextBtn = useRef<HTMLButtonElement>(null);

  const item = quizList[current];
  const total = quizList.length;
  const isLast = current === total - 1;
  const locked = selected !== null;
  const correct = selected === item.answer;
  const progress = ((locked ? current + 1 : current) / total) * 100;

  function answer(i: number) {
    if (locked) return;
    setSelected(i);
    setAnswers((prev) => {
      const copy = prev.slice();
      copy[current] = i;
      return copy;
    });
  }

  function next() {
    if (isLast) {
      onFinish(answers);
      return;
    }
    setCurrent(current + 1);
    setSelected(null);
    window.scrollTo(0, 0);
  }

  // 回答したら「次の問題へ」ボタンにフォーカスを移す
  useEffect(() => {
    if (locked) nextBtn.current?.focus();
  }, [locked]);

  // 1〜4キーでも選べる（表示中の選択肢の数まで）
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (locked) return;
      const i = ["1", "2", "3", "4"].indexOf(e.key);
      if (i >= 0 && i < choiceCount) answer(i);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, choiceCount, current]);

  return (
    <Card
      key={current}
      className="animate-in fade-in slide-in-from-bottom-2 duration-300 [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]"
    >
      <CardHeader className="gap-3">
        <Progress value={progress} className="gap-2">
          <ProgressLabel className="text-sm font-normal tracking-wider text-muted-foreground">
            第{current + 1}問 / 全{total}問
          </ProgressLabel>
        </Progress>
        <h2 className="text-2xl leading-snug font-bold sm:text-3xl">{item.q}</h2>
      </CardHeader>

      <CardContent className="grid gap-3">
        {item.choices.slice(0, choiceCount).map((text, i) => {
          const isAnswer = locked && i === item.answer;
          const isWrong = locked && i === selected && !correct;
          return (
            <Button
              key={i}
              variant="outline"
              disabled={locked}
              onClick={() => answer(i)}
              className={cn(
                "h-auto min-h-15 w-full justify-start gap-4 px-4 py-3 text-left text-lg whitespace-normal",
                "disabled:pointer-events-none disabled:opacity-100",
                isAnswer && "border-correct bg-correct/15 dark:border-correct dark:bg-correct/15",
                isWrong && "border-wrong bg-wrong/15 dark:border-wrong dark:bg-wrong/15",
              )}
            >
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full border border-input text-sm font-bold text-muted-foreground",
                  isAnswer && "border-correct text-correct",
                  isWrong && "border-wrong text-wrong",
                )}
              >
                {LABELS[i]}
              </span>
              <span className="flex-1">{text}</span>
            </Button>
          );
        })}
      </CardContent>

      {/* 回答するまで正解・解説はDOMに入れない */}
      {locked && (
        <CardFooter className="flex-col items-stretch gap-4 border-0 bg-transparent pt-0">
          <Separator />
          <p className={cn("text-xl font-bold", correct ? "text-correct" : "text-wrong")}>
            {correct ? "◯ 正解！" : "✕ 不正解"}
          </p>
          <p className="text-base leading-relaxed text-card-foreground/85 sm:text-lg">
            {item.explanation}
          </p>
          <Button ref={nextBtn} size="lg" className="h-14 w-full text-lg font-semibold" onClick={next}>
            {isLast ? "結果を見る" : "次の問題へ"}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
