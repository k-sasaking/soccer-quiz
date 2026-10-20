"use client";

import type { ResultView } from "@/lib/api-client";

import { ErrorNotice } from "./error-notice";

type Props = {
  result: ResultView; // GET /result の結果
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

export function ResultScreen({ result, loading, error, onRetry }: Props) {
  return (
    <section className="card">
      <p className="eyebrow">RESULT</p>
      <p className="score">
        <span className="score-num">{result.score}</span>
        <span className="score-total"> / {result.questionTotal}問正解</span>
      </p>
      <p className="rate">正答率 {result.correctRate}%</p>

      <ol className="review">
        {result.reviews.map((review) => (
          <li key={review.orderNo} className={`review-item ${review.isCorrect ? "review-correct" : "review-wrong"}`}>
            <span className="review-mark">{review.isCorrect ? "◯" : "✕"}</span>
            <div>
              <p className="review-q">{review.questionBody}</p>
              <p className="review-a">
                あなたの答え：{review.selectedChoice.body}
                {!review.isCorrect && `／正解：${review.correctChoice.body}`}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <ErrorNotice message={error} />

      <button className="btn btn-primary" type="button" disabled={loading} onClick={onRetry}>
        {loading ? "準備中…" : "もう一度挑戦する"}
      </button>
    </section>
  );
}
