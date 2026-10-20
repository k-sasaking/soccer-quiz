"use client";

import { useState } from "react";
import { QUIZ, shuffle, type ChoiceCount, type QuizItem } from "@/data/quiz";
import StartScreen from "./StartScreen";
import QuizScreen from "./QuizScreen";
import ResultScreen from "./ResultScreen";

type Screen = "start" | "quiz" | "result";

export default function Quiz() {
  const [screen, setScreen] = useState<Screen>("start");
  const [choiceCount, setChoiceCount] = useState<ChoiceCount>(3);
  const [quizList, setQuizList] = useState<QuizItem[]>([]); // 出題順にシャッフルした問題
  const [answers, setAnswers] = useState<number[]>([]); // 各問で選んだ選択肢のindex

  function startQuiz(count: ChoiceCount) {
    setChoiceCount(count);
    setQuizList(shuffle(QUIZ));
    setAnswers([]);
    setScreen("quiz");
    window.scrollTo(0, 0);
  }

  function finishQuiz(result: number[]) {
    setAnswers(result);
    setScreen("result");
    window.scrollTo(0, 0);
  }

  if (screen === "quiz") {
    return <QuizScreen quizList={quizList} choiceCount={choiceCount} onFinish={finishQuiz} />;
  }

  if (screen === "result") {
    return (
      <ResultScreen quizList={quizList} answers={answers} onRetry={() => startQuiz(choiceCount)} />
    );
  }

  return <StartScreen onStart={startQuiz} />;
}
