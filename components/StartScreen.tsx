"use client";

import { useState } from "react";
import Link from "next/link";
import type { ChoiceCount } from "@/data/quiz";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type Props = {
  onStart: (count: ChoiceCount) => void;
};

const MODES: ChoiceCount[] = [3, 4];

export default function StartScreen({ onStart }: Props) {
  const [mode, setMode] = useState<ChoiceCount>(3);

  return (
    <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300 [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
      <CardHeader className="gap-3">
        <Badge variant="outline" className="tracking-[0.28em] text-muted-foreground">
          QUIZ
        </Badge>
        <CardTitle className="text-3xl font-bold tracking-wide sm:text-4xl">
          <h1>サッカークイズ</h1>
        </CardTitle>
        <CardDescription className="text-base leading-relaxed sm:text-lg">
          全10問・{mode}択。1問ずつ出題します。
          <br />
          答えを選ぶと、正解と解説が表示されます。
        </CardDescription>
      </CardHeader>

      <CardContent>
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-3 text-sm tracking-wider text-muted-foreground">選択肢の数</legend>
          <RadioGroup
            value={String(mode)}
            onValueChange={(value) => setMode(Number(value) === 4 ? 4 : 3)}
            className="grid-cols-2 gap-3"
          >
            {MODES.map((count) => (
              <label
                key={count}
                className={cn(
                  "flex min-h-14 cursor-pointer items-center justify-center gap-3 rounded-lg border border-input bg-input/30 text-lg font-semibold transition-colors",
                  "hover:bg-input/50 has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                  "has-data-checked:border-primary has-data-checked:bg-primary has-data-checked:text-primary-foreground",
                )}
              >
                <RadioGroupItem value={String(count)} aria-label={`${count}択`} className="sr-only" />
                {count}択
              </label>
            ))}
          </RadioGroup>
        </fieldset>
      </CardContent>

      <CardFooter className="flex-col items-stretch gap-3 border-0 bg-transparent pt-0">
        <Button size="lg" className="h-14 w-full text-lg font-semibold" onClick={() => onStart(mode)}>
          スタート
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="h-12 w-full text-base text-muted-foreground"
          nativeButton={false} render={<Link href="/contact" />}
        >
          お問い合わせ
        </Button>
      </CardFooter>
    </Card>
  );
}
