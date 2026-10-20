"use client";

import { useState } from "react";

import type { QuizInfo } from "@/lib/api-client";

import { ErrorNotice } from "./error-notice";

type Props = {
  quiz: QuizInfo | null; // GET /quiz の結果。取得前は null
  loading: boolean;
  error: string | null;
  onStart: (choiceCount: number) => void;
  onReload: () => void;
};

export function StartScreen({ quiz, loading, error, onStart, onReload }: Props) {
  const choiceCounts = quiz?.choiceCounts ?? [3, 4];
  const [choiceCount, setChoiceCount] = useState(choiceCounts[0]);

  const canStart = quiz !== null && !loading;

  return (
    <section className="card">
      <p className="eyebrow">QUIZ</p>
      <h1>サッカークイズ</h1>
      <p className="lead">
        全{quiz ? quiz.questionTotal : "…"}問・{choiceCount}択。1問ずつ出題します。
        <br />
        答えを選ぶと、正解と解説が表示されます。
      </p>

      <ErrorNotice message={error} />
      {loading && quiz === null && <p className="loading">読み込み中…</p>}

      <fieldset className="mode">
        <legend className="mode-legend">選択肢の数</legend>
        <div className="mode-options">
          {choiceCounts.map((count) => (
            <span key={count} style={{ display: "contents" }}>
              <input
                className="mode-input"
                type="radio"
                name="mode"
                id={`mode-${count}`}
                value={count}
                checked={choiceCount === count}
                onChange={() => setChoiceCount(count)}
              />
              <label className="mode-option" htmlFor={`mode-${count}`}>
                {count}択
              </label>
            </span>
          ))}
        </div>
      </fieldset>

      {quiz === null && !loading ? (
        <button className="btn btn-primary" type="button" onClick={onReload}>
          もう一度読み込む
        </button>
      ) : (
        <button className="btn btn-primary" type="button" disabled={!canStart} onClick={() => onStart(choiceCount)}>
          {loading && quiz !== null ? "準備中…" : "スタート"}
        </button>
      )}
    </section>
  );
}
