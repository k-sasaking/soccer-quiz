"use strict";

// クイズ.md の内容をそのまま転記（answer は 0=A / 1=B / 2=C）
// choices の4つ目は4択用のダミー。正解は必ず先頭3つの中に置く
const QUIZ = [
  {
    q: "サッカーの1チームの人数は何人ですか？",
    choices: ["10人", "11人", "12人", "9人"],
    answer: 1,
    explanation: "「サッカーは基本的に1チーム11人で試合をします。」（soccer_knowledge.md 「1. サッカーの基本ルール」より）"
  },
  {
    q: "サッカーの通常の試合時間は何分ですか？",
    choices: ["80分", "90分", "100分", "120分"],
    answer: 1,
    explanation: "「通常の試合時間は90分です。前半45分、後半45分に分かれています。」（soccer_knowledge.md 「1. サッカーの基本ルール」より）"
  },
  {
    q: "ペナルティーキックの地点は、ゴールラインから何メートルの位置ですか？",
    choices: ["9メートル", "11メートル", "13メートル", "15メートル"],
    answer: 1,
    explanation: "「ペナルティーキックの地点は、ゴールラインから11メートルの位置です。」（soccer_knowledge.md 「1. サッカーの基本ルール」より）"
  },
  {
    q: "警告を意味するカードは何色ですか？",
    choices: ["イエローカード", "レッドカード", "ブルーカード", "グリーンカード"],
    answer: 0,
    explanation: "「イエローカードは警告を意味します。」（soccer_knowledge.md 「1. サッカーの基本ルール」より）"
  },
  {
    q: "男子FIFAワールドカップの第1回大会（1930年）の開催国はどこですか？",
    choices: ["ブラジル", "ウルグアイ", "アルゼンチン", "スウェーデン"],
    answer: 1,
    explanation: "「1930年大会の開催国はウルグアイです。」（soccer_knowledge.md 「2. FIFAワールドカップの歴史」より）"
  },
  {
    q: "2002年大会は日本とどこの国が共同開催しましたか？",
    choices: ["中国", "韓国", "タイ", "アメリカ"],
    answer: 1,
    explanation: "「2002年大会は日本と韓国の共同開催でした。」（soccer_knowledge.md 「2. FIFAワールドカップの歴史」より）"
  },
  {
    q: "2014年ワールドカップ決勝で、ドイツはアルゼンチンに何対何で勝ちましたか？",
    choices: ["1対0", "2対1", "2対0", "4対2"],
    answer: 0,
    explanation: "「2014年決勝でドイツはアルゼンチンに1対0で勝ちました。」（soccer_knowledge.md 「2. FIFAワールドカップの歴史」より）"
  },
  {
    q: "2022年カタール大会の決勝は、延長戦終了時点で何対何でしたか？",
    choices: ["2対2", "3対3", "4対4", "1対1"],
    answer: 1,
    explanation: "「2022年決勝は延長戦終了時点で3対3でした。」（soccer_knowledge.md 「2. FIFAワールドカップの歴史」より）"
  },
  {
    q: "2022年大会のグループステージで、日本が2対1で勝利した国はどこですか？（1つ選んでください）",
    choices: ["スペイン", "フランス", "クロアチア", "イタリア"],
    answer: 0,
    explanation: "「2022年大会のグループステージで、日本はドイツに2対1で勝利しました。2022年大会のグループステージで、日本はスペインにも2対1で勝利しました。」（soccer_knowledge.md 「3. 日本代表とワールドカップ」より）"
  },
  {
    q: "2022年大会の決勝トーナメント1回戦で日本と対戦し、PK戦の末に勝利した国はどこですか？",
    choices: ["クロアチア", "ドイツ", "スペイン", "ブラジル"],
    answer: 0,
    explanation: "「日本対クロアチアは延長戦を終えて1対1で、PK戦の結果クロアチアが勝利しました。」（soccer_knowledge.md 「3. 日本代表とワールドカップ」より）"
  }
];

const LABELS = ["A", "B", "C", "D"];

const el = {
  start: document.getElementById("start"),
  startBtn: document.getElementById("start-btn"),
  leadMode: document.getElementById("lead-mode"),
  modeInputs: document.querySelectorAll(".mode-input"),
  quiz: document.getElementById("quiz"),
  counter: document.getElementById("counter"),
  barFill: document.getElementById("bar-fill"),
  question: document.getElementById("question"),
  choices: document.getElementById("choices"),
  feedback: document.getElementById("feedback"),
  judge: document.getElementById("judge"),
  explanation: document.getElementById("explanation"),
  nextBtn: document.getElementById("next-btn"),
  result: document.getElementById("result"),
  scoreNum: document.getElementById("score-num"),
  rate: document.getElementById("rate"),
  review: document.getElementById("review"),
  retryBtn: document.getElementById("retry-btn")
};

let quizList = [];  // 出題順にシャッフルした問題（QUIZ のコピー）
let current = 0;
let answers = [];   // 各問で選んだ選択肢のindex
let locked = false; // 回答済みで選択肢を押せない状態
let choiceCount = 3; // 表示する選択肢の数（3 or 4）

// Fisher-Yatesでシャッフルした新しい配列を返す（元の配列は変更しない）
function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

function show(section) {
  el.start.hidden = section !== el.start;
  el.quiz.hidden = section !== el.quiz;
  el.result.hidden = section !== el.result;
}

function renderQuestion() {
  const item = quizList[current];
  locked = false;

  el.counter.textContent = "第" + (current + 1) + "問 / 全" + quizList.length + "問";
  el.barFill.style.width = (current / quizList.length) * 100 + "%";
  el.question.textContent = item.q;

  // 回答するまで正解・解説はDOMに入れない
  el.feedback.hidden = true;
  el.judge.textContent = "";
  el.judge.className = "judge";
  el.explanation.textContent = "";

  el.choices.textContent = "";
  item.choices.slice(0, choiceCount).forEach(function (text, i) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice";
    btn.dataset.index = String(i);

    const label = document.createElement("span");
    label.className = "choice-label";
    label.textContent = LABELS[i];

    const body = document.createElement("span");
    body.className = "choice-text";
    body.textContent = text;

    btn.append(label, body);
    btn.addEventListener("click", function () { answer(i); });
    el.choices.append(btn);
  });

  window.scrollTo(0, 0);
}

function answer(selected) {
  if (locked) return;
  locked = true;

  const item = quizList[current];
  const correct = selected === item.answer;
  answers[current] = selected;

  const buttons = el.choices.querySelectorAll(".choice");
  buttons.forEach(function (btn) {
    const i = Number(btn.dataset.index);
    btn.disabled = true;
    if (i === item.answer) btn.classList.add("is-correct");
    if (i === selected && !correct) btn.classList.add("is-wrong");
  });

  el.judge.textContent = correct ? "◯ 正解！" : "✕ 不正解";
  el.judge.className = "judge " + (correct ? "judge-correct" : "judge-wrong");
  el.explanation.textContent = item.explanation;
  el.nextBtn.textContent = current === quizList.length - 1 ? "結果を見る" : "次の問題へ";
  el.feedback.hidden = false;
  el.barFill.style.width = ((current + 1) / quizList.length) * 100 + "%";
  el.nextBtn.focus();
}

function next() {
  if (current === quizList.length - 1) {
    showResult();
  } else {
    current += 1;
    renderQuestion();
  }
}

function showResult() {
  const score = quizList.reduce(function (sum, item, i) {
    return sum + (answers[i] === item.answer ? 1 : 0);
  }, 0);

  el.scoreNum.textContent = String(score);
  el.rate.textContent = "正答率 " + Math.round((score / quizList.length) * 100) + "%";

  el.review.textContent = "";
  quizList.forEach(function (item, i) {
    const correct = answers[i] === item.answer;

    const li = document.createElement("li");
    li.className = "review-item " + (correct ? "review-correct" : "review-wrong");

    const mark = document.createElement("span");
    mark.className = "review-mark";
    mark.textContent = correct ? "◯" : "✕";

    const body = document.createElement("div");

    const q = document.createElement("p");
    q.className = "review-q";
    q.textContent = item.q;

    const a = document.createElement("p");
    a.className = "review-a";
    a.textContent = correct
      ? "あなたの答え：" + item.choices[answers[i]]
      : "あなたの答え：" + item.choices[answers[i]] + "／正解：" + item.choices[item.answer];

    body.append(q, a);
    li.append(mark, body);
    el.review.append(li);
  });

  show(el.result);
  window.scrollTo(0, 0);
}

function startQuiz(count) {
  choiceCount = count === 4 ? 4 : 3;
  quizList = shuffle(QUIZ);
  current = 0;
  answers = [];
  show(el.quiz);
  renderQuestion();
}

function selectedMode() {
  const checked = document.querySelector(".mode-input:checked");
  return checked ? Number(checked.value) : 3;
}

// スタート画面の説明文を、選んだ択数に合わせて出し分ける
function updateLead() {
  el.leadMode.textContent = selectedMode() + "択";
}

el.modeInputs.forEach(function (input) {
  input.addEventListener("change", updateLead);
});
updateLead();

el.startBtn.addEventListener("click", function () { startQuiz(selectedMode()); });
el.retryBtn.addEventListener("click", function () { startQuiz(choiceCount); });
el.nextBtn.addEventListener("click", next);

// 1〜4キーでも選べる（表示中の選択肢の数まで）
document.addEventListener("keydown", function (e) {
  if (el.quiz.hidden || locked) return;
  const i = ["1", "2", "3", "4"].indexOf(e.key);
  if (i >= 0 && i < choiceCount) answer(i);
});
