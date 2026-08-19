/**
 * 英単語から自然な英文穴埋め例文および日本語訳を自動生成するエンジン
 */

interface GeneratedResult {
  sentence: string;
  japanese: string;
}

// 定番単語の高品質例文データベース
const COMMON_SENTENCE_DB: Record<string, { sentence: string; japanese: string }> = {
  APPLE: { sentence: 'An APPLE a day keeps the doctor away.', japanese: '1日1個のりんごは医者を遠ざける。' },
  BANANA: { sentence: 'Monkeys love to eat a sweet BANANA.', japanese: 'サルは甘いバナナを食べるのが大好きです。' },
  CAT: { sentence: 'The CAT is sleeping peacefully on the warm sofa.', japanese: '猫は暖かいソファの上で安らかに眠っています。' },
  DOG: { sentence: 'My DOG loves to play fetch in the sunny park.', japanese: '私の犬は日当たりの良い公園でボール投げをするのが大好きです。' },
  BOOK: { sentence: 'I enjoy reading an interesting BOOK before sleep.', japanese: '私は寝る前に面白い本を読むのを楽しみます。' },
  CAR: { sentence: 'He drives his red CAR to work every morning.', japanese: '彼は毎朝赤い車に乗って出勤します。' },
  COMPUTER: { sentence: 'We use a COMPUTER for studying and working.', japanese: '私たちは勉強や仕事のためにパソコンを使います。' },
  FRIEND: { sentence: 'A true FRIEND will always support you in hard times.', japanese: '真の友人は辛い時にいつもあなたを支えてくれます。' },
  HAPPY: { sentence: 'Everyone wants to live a HAPPY and healthy life.', japanese: '誰しも幸せで健康な人生を送りたいと願っています。' },
  LOVE: { sentence: 'Love and kindness can change the whole world.', japanese: '愛と思いやりは世界全体を変えることができます。' },
  MUSIC: { sentence: 'Listening to good MUSIC relaxes my mind.', japanese: '良い音楽を聴くと心がリラックスします。' },
  SCHOOL: { sentence: 'Students learn many subjects at SCHOOL.', japanese: '生徒たちは学校で多くの教科を学びます。' },
  SUN: { sentence: 'The bright SUN rises gracefully in the east.', japanese: '明るい太陽が東からしとやかに昇ります。' },
  WATER: { sentence: 'Drink plenty of fresh WATER to stay healthy.', japanese: '健康を保つために新鮮な水をたくさん飲みましょう。' },
  TIME: { sentence: 'Time passes quickly when you are having fun.', japanese: '楽しんでいる時は時間が経つのを早く感じます。' },
  WORLD: { sentence: 'People from all over the WORLD connected online.', japanese: '世界中の人々がオンラインでつながりました。' },
};

// 汎用テンプレート生成パターン
const TEMPLATES = [
  {
    template: 'Learning the meaning of $WORD is very useful for English learners.',
    ja: '「$WORD」の意味を学ぶことは英語学習者にとって大変役立ちます。',
  },
  {
    template: 'We can see the word $WORD used frequently in daily conversation.',
    ja: '日常会話で「$WORD」という言葉がよく使われるのを見かけます。',
  },
  {
    template: 'Understanding how to use $WORD helps improve your vocabulary.',
    ja: '「$WORD」の使い方を理解すると語彙力の向上に役立ちます。',
  },
  {
    template: 'She remembered the key word $WORD during the English test.',
    ja: '彼女は英語のテスト中に重要単語「$WORD」を思い出しました。',
  },
];

export function generateSentenceForWord(word: string, currentJapanese?: string): GeneratedResult {
  const cleanWord = word.trim().toUpperCase();

  // 1. データベースに存在する場合はそれを採用
  if (COMMON_SENTENCE_DB[cleanWord]) {
    const dbItem = COMMON_SENTENCE_DB[cleanWord];
    return {
      sentence: dbItem.sentence,
      japanese: currentJapanese && currentJapanese !== '（訳未指定）' ? currentJapanese : dbItem.japanese,
    };
  }

  // 2. テンプレート選択（単語の長さやハッシュ値に基づいてランダム風決定）
  const hash = cleanWord.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const templateObj = TEMPLATES[hash % TEMPLATES.length];

  const formattedWord = cleanWord;
  const sentence = templateObj.template.replace('$WORD', formattedWord);
  const defaultJa = currentJapanese && currentJapanese !== '（訳未指定）' ? currentJapanese : templateObj.ja.replace('$WORD', cleanWord.toLowerCase());

  return {
    sentence,
    japanese: defaultJa,
  };
}
