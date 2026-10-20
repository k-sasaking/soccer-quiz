"use client";

import { Fragment } from "react";
import type { QuizItem } from "@/data/quiz";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Props = {
  quizList: QuizItem[];
  answers: number[];
  onRetry: () => void;
};

export default function ResultScreen({ quizList, answers, onRetry }: Props) {
  const total = quizList.length;
  const score = quizList.reduce((sum, item, i) => sum + (answers[i] === item.answer ? 1 : 0), 0);
  const rate = Math.round((score / total) * 100);

  return (
    <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300 [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
      <CardHeader className="gap-2">
        <Badge variant="outline" className="tracking-[0.28em] text-muted-foreground">
          RESULT
        </Badge>
        <p className="text-lg text-muted-foreground">
          <span className="text-6xl font-bold tracking-wide text-foreground">{score}</span>
          <span> / {total}問正解</span>
        </p>
        <p className="text-muted-foreground">正答率 {rate}%</p>
      </CardHeader>

      <CardContent>
        <Separator />
        <ol className="list-none p-0">
          {quizList.map((item, i) => {
            const correct = answers[i] === item.answer;
            return (
              <Fragment key={i}>
                <li className="flex gap-4 py-4">
                  <span
                    className={cn(
                      "shrink-0 text-lg font-bold",
                      correct ? "text-correct" : "text-wrong",
                    )}
                  >
                    {correct ? "◯" : "✕"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-base leading-relaxed">{item.q}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {correct
                        ? "あなたの答え：" + item.choices[answers[i]]
                        : "あなたの答え：" +
                          item.choices[answers[i]] +
                          "／正解：" +
                          item.choices[item.answer]}
                    </p>
                  </div>
                </li>
                <Separator />
              </Fragment>
            );
          })}
        </ol>
      </CardContent>

      <CardFooter className="border-0 bg-transparent pt-0">
        <Button size="lg" className="h-14 w-full text-lg font-semibold" onClick={onRetry}>
          もう一度挑戦する
        </Button>
      </CardFooter>
    </Card>
  );
}
