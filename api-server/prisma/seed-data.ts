// DB に入れる初期データ（npm run db:seed で投入する）。テーブルの形は docs/db.md に合わせている。
// 中身は静的版の QUIZ 配列（今は data/quiz.ts、もとは script.js。元データは クイズ.md）から転記した。
// 問題を変えるときは、クイズ.md・data/quiz.ts・このファイルをそろえて直し、npm run db:seed を実行する。

export type SeedQuestion = {
  sectionNo: number;
  body: string;
  quote: string;
  // 1=A / 2=B / 3=C / 4=D（D は4択用のダミー）
  choices: [string, string, string, string];
  // 正解は必ず A〜C
  correctNo: 1 | 2 | 3;
};

export const source = { fileName: "soccer_knowledge.md", title: "サッカークイズ用 Knowledge" };

export const sections = [
  { sectionNo: 1, title: "サッカーの基本ルール" },
  { sectionNo: 2, title: "FIFAワールドカップの歴史" },
  { sectionNo: 3, title: "日本代表とワールドカップ" },
];

// 並び順がそのまま問題番号（question_no）になる
export const questions: SeedQuestion[] = [
  {
    sectionNo: 1,
    body: "サッカーの1チームの人数は何人ですか？",
    quote: "サッカーは基本的に1チーム11人で試合をします。",
    choices: ["10人", "11人", "12人", "9人"],
    correctNo: 2,
  },
  {
    sectionNo: 1,
    body: "サッカーの通常の試合時間は何分ですか？",
    quote: "通常の試合時間は90分です。前半45分、後半45分に分かれています。",
    choices: ["80分", "90分", "100分", "120分"],
    correctNo: 2,
  },
  {
    sectionNo: 1,
    body: "ペナルティーキックの地点は、ゴールラインから何メートルの位置ですか？",
    quote: "ペナルティーキックの地点は、ゴールラインから11メートルの位置です。",
    choices: ["9メートル", "11メートル", "13メートル", "15メートル"],
    correctNo: 2,
  },
  {
    sectionNo: 1,
    body: "警告を意味するカードは何色ですか？",
    quote: "イエローカードは警告を意味します。",
    choices: ["イエローカード", "レッドカード", "ブルーカード", "グリーンカード"],
    correctNo: 1,
  },
  {
    sectionNo: 2,
    body: "男子FIFAワールドカップの第1回大会（1930年）の開催国はどこですか？",
    quote: "1930年大会の開催国はウルグアイです。",
    choices: ["ブラジル", "ウルグアイ", "アルゼンチン", "スウェーデン"],
    correctNo: 2,
  },
  {
    sectionNo: 2,
    body: "2002年大会は日本とどこの国が共同開催しましたか？",
    quote: "2002年大会は日本と韓国の共同開催でした。",
    choices: ["中国", "韓国", "タイ", "アメリカ"],
    correctNo: 2,
  },
  {
    sectionNo: 2,
    body: "2014年ワールドカップ決勝で、ドイツはアルゼンチンに何対何で勝ちましたか？",
    quote: "2014年決勝でドイツはアルゼンチンに1対0で勝ちました。",
    choices: ["1対0", "2対1", "2対0", "4対2"],
    correctNo: 1,
  },
  {
    sectionNo: 2,
    body: "2022年カタール大会の決勝は、延長戦終了時点で何対何でしたか？",
    quote: "2022年決勝は延長戦終了時点で3対3でした。",
    choices: ["2対2", "3対3", "4対4", "1対1"],
    correctNo: 2,
  },
  {
    sectionNo: 3,
    body: "2022年大会のグループステージで、日本が2対1で勝利した国はどこですか？（1つ選んでください）",
    quote:
      "2022年大会のグループステージで、日本はドイツに2対1で勝利しました。2022年大会のグループステージで、日本はスペインにも2対1で勝利しました。",
    choices: ["スペイン", "フランス", "クロアチア", "イタリア"],
    correctNo: 1,
  },
  {
    sectionNo: 3,
    body: "2022年大会の決勝トーナメント1回戦で日本と対戦し、PK戦の末に勝利した国はどこですか？",
    quote: "日本対クロアチアは延長戦を終えて1対1で、PK戦の結果クロアチアが勝利しました。",
    choices: ["クロアチア", "ドイツ", "スペイン", "ブラジル"],
    correctNo: 1,
  },
];
