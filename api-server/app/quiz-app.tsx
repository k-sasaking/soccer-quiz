"use client";

// クイズの画面（スタート／問題／結果）。データはすべて /api/v1 から取得する。
// - 問題を取得する API は正解・解説を返さないので、回答するまで画面にも出ない
// - 出題順・択数・正誤判定・集計はサーバー側が行う
// - ログインが切れたら（API が 401 を返したら）ログイン画面へ移る

import { useCallback, useEffect, useState } from "react";

import {
  createPlaySession,
  errorMessage,
  fetchQuestion,
  fetchQuiz,
  fetchResult,
  finishPlaySession,
  isUnauthorized,
  submitAnswer,
  type AnswerView,
  type PlaySessionView,
  type QuestionView,
  type QuizInfo,
  type ResultView,
} from "@/lib/api-client";

import { ResultScreen } from "./_components/result-screen";
import { QuestionScreen } from "./_components/question-screen";
import { StartScreen } from "./_components/start-screen";

type Screen =
  | { kind: "start" }
  | { kind: "quiz"; session: PlaySessionView; question: QuestionView; answer: AnswerView | null }
  | { kind: "result"; result: ResultView; choiceCount: number };

export function QuizApp() {
  const [quiz, setQuiz] = useState<QuizInfo | null>(null);
  const [screen, setScreen] = useState<Screen>({ kind: "start" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 画面を開いたら、問題数と選べる択数を取得する
  const loadQuiz = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setQuiz(await fetchQuiz());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQuiz();
  }, [loadQuiz]);

  // API を呼ぶ処理の共通部分（二重送信の防止・エラー表示）
  const run = useCallback(
    async (task: () => Promise<void>) => {
      if (loading) return;
      setLoading(true);
      setError(null);
      try {
        await task();
      } catch (e) {
        if (isUnauthorized(e)) {
          window.location.assign("/login");
          return;
        }
        setError(errorMessage(e));
      } finally {
        setLoading(false);
      }
    },
    [loading],
  );

  const start = (choiceCount: number) =>
    run(async () => {
      const session = await createPlaySession(choiceCount);
      const question = await fetchQuestion(session.id, session.nextOrderNo ?? 1);
      setScreen({ kind: "quiz", session, question, answer: null });
      window.scrollTo(0, 0);
    });

  const answer = (choiceNo: number) => {
    if (screen.kind !== "quiz" || screen.answer !== null) return;
    const { session, question } = screen;
    return run(async () => {
      const result = await submitAnswer(session.id, question.orderNo, choiceNo);
      setScreen({ kind: "quiz", session, question, answer: result });
    });
  };

  const next = () => {
    if (screen.kind !== "quiz" || screen.answer === null) return;
    const { session, answer: answered } = screen;
    return run(async () => {
      if (answered.nextOrderNo === null) {
        await finishPlaySession(session.id);
        const result = await fetchResult(session.id);
        setScreen({ kind: "result", result, choiceCount: session.choiceCount });
      } else {
        const question = await fetchQuestion(session.id, answered.nextOrderNo);
        setScreen({ kind: "quiz", session, question, answer: null });
      }
      window.scrollTo(0, 0);
    });
  };

  if (screen.kind === "quiz") {
    return (
      <QuestionScreen
        question={screen.question}
        answer={screen.answer}
        loading={loading}
        error={error}
        onAnswer={answer}
        onNext={next}
      />
    );
  }

  if (screen.kind === "result") {
    return (
      <ResultScreen
        result={screen.result}
        loading={loading}
        error={error}
        onRetry={() => start(screen.choiceCount)}
      />
    );
  }

  return <StartScreen quiz={quiz} loading={loading} error={error} onStart={start} onReload={loadQuiz} />;
}
