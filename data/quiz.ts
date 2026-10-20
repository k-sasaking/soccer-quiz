// クイズ.md の内容をそのまま転記（answer は 0=A / 1=B / 2=C）
// choices の4つ目は4択用のダミー。正解は必ず先頭3つの中に置く
export type QuizItem = {
  q: string;
  choices: string[];
  answer: number;
  explanation: string;
};

export const QUIZ: QuizItem[] = [
  {
    q: "サッカーの1チームの人数は何人ですか？",
    choices: ["10人", "11人", "12人", "9人"],
    answer: 1,
    explanation:
      "「サッカーは基本的に1チーム11人で試合をします。」（soccer_knowledge.md 「1. サッカーの基本ルール」より）",
  },
  {
    q: "サッカーの通常の試合時間は何分ですか？",
    choices: ["80分", "90分", "100分", "120分"],
    answer: 1,
    explanation:
      "「通常の試合時間は90分です。前半45分、後半45分に分かれています。」（soccer_knowledge.md 「1. サッカーの基本ルール」より）",
  },
  {
    q: "ペナルティーキックの地点は、ゴールラインから何メートルの位置ですか？",
    choices: ["9メートル", "11メートル", "13メートル", "15メートル"],
    answer: 1,
    explanation:
      "「ペナルティーキックの地点は、ゴールラインから11メートルの位置です。」（soccer_knowledge.md 「1. サッカーの基本ルール」より）",
  },
  {
    q: "警告を意味するカードは何色ですか？",
    choices: ["イエローカード", "レッドカード", "ブルーカード", "グリーンカード"],
    answer: 0,
    explanation:
      "「イエローカードは警告を意味します。」（soccer_knowledge.md 「1. サッカーの基本ルール」より）",
  },
  {
    q: "男子FIFAワールドカップの第1回大会（1930年）の開催国はどこですか？",
    choices: ["ブラジル", "ウルグアイ", "アルゼンチン", "スウェーデン"],
    answer: 1,
    explanation:
      "「1930年大会の開催国はウルグアイです。」（soccer_knowledge.md 「2. FIFAワールドカップの歴史」より）",
  },
  {
    q: "2002年大会は日本とどこの国が共同開催しましたか？",
    choices: ["中国", "韓国", "タイ", "アメリカ"],
    answer: 1,
    explanation:
      "「2002年大会は日本と韓国の共同開催でした。」（soccer_knowledge.md 「2. FIFAワールドカップの歴史」より）",
  },
  {
    q: "2014年ワールドカップ決勝で、ドイツはアルゼンチンに何対何で勝ちましたか？",
    choices: ["1対0", "2対1", "2対0", "4対2"],
    answer: 0,
    explanation:
      "「2014年決勝でドイツはアルゼンチンに1対0で勝ちました。」（soccer_knowledge.md 「2. FIFAワールドカップの歴史」より）",
  },
  {
    q: "2022年カタール大会の決勝は、延長戦終了時点で何対何でしたか？",
    choices: ["2対2", "3対3", "4対4", "1対1"],
    answer: 1,
    explanation:
      "「2022年決勝は延長戦終了時点で3対3でした。」（soccer_knowledge.md 「2. FIFAワールドカップの歴史」より）",
  },
  {
    q: "2022年大会のグループステージで、日本が2対1で勝利した国はどこですか？（1つ選んでください）",
    choices: ["スペイン", "フランス", "クロアチア", "イタリア"],
    answer: 0,
    explanation:
      "「2022年大会のグループステージで、日本はドイツに2対1で勝利しました。2022年大会のグループステージで、日本はスペインにも2対1で勝利しました。」（soccer_knowledge.md 「3. 日本代表とワールドカップ」より）",
  },
  {
    q: "2022年大会の決勝トーナメント1回戦で日本と対戦し、PK戦の末に勝利した国はどこですか？",
    choices: ["クロアチア", "ドイツ", "スペイン", "ブラジル"],
    answer: 0,
    explanation:
      "「日本対クロアチアは延長戦を終えて1対1で、PK戦の結果クロアチアが勝利しました。」（soccer_knowledge.md 「3. 日本代表とワールドカップ」より）",
  },
];

export const LABELS = ["A", "B", "C", "D"];

export type ChoiceCount = 3 | 4;

// Fisher-Yatesでシャッフルした新しい配列を返す（元の配列は変更しない）
export function shuffle<T>(list: T[]): T[] {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}
