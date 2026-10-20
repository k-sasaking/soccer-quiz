"use client";

import { useEffect, useRef } from "react";

import type { AnswerView, QuestionView } from "@/lib/api-client";

import { ErrorNotice } from "./error-notice";

type Props = {
  question: QuestionView; // GET /questions/{orderNo} の結果（正解・解説は含まれない）
  answer: AnswerView | null; // PUT /answer の結果。回答するまで null
  loading: boolean;
  error: string | null;
  onAnswer: (choiceNo: number) => void;
  onNext: () => void;
};

export function QuestionScreen({ question, answer, loading, error, onAnswer, onNext }: Props) {
  const nextButton = useRef<HTMLButtonElement>(null);
  const answered = answer !== null;

  // 回答が返ってきたら「次へ」ボタンにフォーカスを移す
  useEffect(() => {
    if (answered) nextButton.current?.focus();
  }, [answered]);

  // 1〜4キーでも選べる（表示中の選択肢の数まで）
  useEffect(() => {
    if (answered) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const i = ["1", "2", "3", "4"].indexOf(e.key);
      if (i >= 0 && i < question.choices.length) onAnswer(question.choices[i].choiceNo);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [answered, question, onAnswer]);

  const done = answered ? question.orderNo : question.orderNo - 1;
  const progress = (done / question.questionTotal) * 100;

  return (
    <section className="card">
      <div className="meta">
        <span className="counter">
          第{question.orderNo}問 / 全{question.questionTotal}問
        </span>
        <div className="bar">
          <div className="bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <h2 className="question">{question.body}</h2>

      <ErrorNotice message={error} />

      <div className="choices" aria-busy={loading && !answered}>
        {question.choices.map((choice) => {
          const isCorrect = answered && choice.choiceNo === answer.correctChoice.choiceNo;
          const isWrong = answered && !answer.isCorrect && choice.choiceNo === answer.selectedChoice.choiceNo;
          const className = ["choice", isCorrect ? "is-correct" : "", isWrong ? "is-wrong" : ""]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={choice.choiceNo}
              type="button"
              className={className}
              disabled={answered || loading}
              onClick={() => onAnswer(choice.choiceNo)}
            >
              <span className="choice-label">{choice.label}</span>
              <span className="choice-text">{choice.body}</span>
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="feedback">
          <p className={`judge ${answer.isCorrect ? "judge-correct" : "judge-wrong"}`}>
            {answer.isCorrect ? "◯ 正解！" : "✕ 不正解"}
          </p>
          <p className="explanation">{answer.explanation.text}</p>
          <button ref={nextButton} className="btn btn-primary" type="button" disabled={loading} onClick={onNext}>
            {loading ? "読み込み中…" : answer.nextOrderNo === null ? "結果を見る" : "次の問題へ"}
          </button>
        </div>
      )}
    </section>
  );
}
