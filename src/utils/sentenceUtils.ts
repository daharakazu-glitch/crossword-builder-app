/**
 * 英文穴埋め例文から正解単語を埋め込んだ完全形英文（Full Sentence）を生成するユーティリティ
 */

export function getCompleteSentence(sentence: string | undefined, word: string): string {
  const cleanWord = word.trim().toUpperCase().replace(/[^A-Z]/g, '');
  if (!cleanWord) return '';

  if (!sentence || !sentence.trim()) {
    // 例文が存在しない場合は単語そのものをピリオド付きで返す
    return `${cleanWord}.`;
  }

  let s = sentence.trim();

  // 1. 各種穴埋めパターン（アンダースコア連続、括弧内の空白・アンダースコア・ピリオドなど）
  // 例: "____", "___", "( )", "（ ）", "[ ]", "( ___ )", "（____）", "(　　　　)"
  const blankPatterns = [
    /[（\(]\s*[_＿\s\u3000\.]+\s*[）\)]/g,
    /\[\s*[_＿\s\u3000\.]+\s*\]/g,
    /[（\(]\s*[）\)]/g,
    /\[\s*\]/g,
    /[_＿]{2,}/g,
  ];

  let replaced = false;
  for (const pattern of blankPatterns) {
    if (pattern.test(s)) {
      s = s.replace(pattern, cleanWord);
      replaced = true;
    }
  }

  if (replaced) {
    return s;
  }

  // 2. 単語そのものが既に文中に含まれているかチェック (大文字小文字問わず)
  const wordRegex = new RegExp(`\\b${cleanWord}\\b`, 'i');
  if (wordRegex.test(s)) {
    return s;
  }

  // 3. 単語も穴埋めも見当たらない場合は末尾に単語を補う
  return `${s} (${cleanWord})`;
}
