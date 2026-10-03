import type { CrosswordPuzzlePackage, CellData } from '../types/crossword';

export const LEAP_PART3_WEEK1_PACKAGE: CrosswordPuzzlePackage = {
  version: '1.0.0',
  title: 'LEAP_Part3_Week1 （10月5日（月）提出）',
  subtitle: 'Class      　　　　     No       　　　　       Name: ________________________________',
  gridSize: 25,
  hintStyle: 'sentence_ja',
  theme: 'classic',
  showFirstLetters: false,
  grid: {
    size: 25,
    cells: (() => {
      const cells: CellData[][] = [];
      for (let r = 0; r < 25; r++) {
        const row: CellData[] = [];
        for (let c = 0; c < 25; c++) {
          row.push({
            row: r,
            col: c,
            letter: '',
            userLetter: '',
            isBlack: true,
          });
        }
        cells.push(row);
      }

      const across = [
        { num: 3, word: 'FLAVOR', r: 2, c: 7 },
        { num: 6, word: 'DIVORCE', r: 3, c: 18 },
        { num: 8, word: 'SPARE', r: 4, c: 14 },
        { num: 9, word: 'CONSULT', r: 5, c: 4 },
        { num: 11, word: 'CLASSICAL', r: 6, c: 13 },
        { num: 12, word: 'TEMPORARY', r: 8, c: 7 },
        { num: 14, word: 'FATE', r: 9, c: 2 },
        { num: 15, word: 'CREDITS', r: 9, c: 17 },
        { num: 18, word: 'WIPED', r: 10, c: 12 },
        { num: 23, word: 'NAP', r: 12, c: 2 },
        { num: 24, word: 'QUESTIONNAIRE', r: 12, c: 6 },
        { num: 27, word: 'REGISTER', r: 14, c: 0 },
        { num: 29, word: 'DYE', r: 14, c: 22 },
        { num: 30, word: 'EMERGENCY', r: 15, c: 13 },
        { num: 35, word: 'LITERATURE', r: 19, c: 9 },
        { num: 36, word: 'PORTIONS', r: 22, c: 17 },
        { num: 37, word: 'ENCLOSED', r: 24, c: 13 },
      ];

      const down = [
        { num: 1, word: 'GOODS', r: 0, c: 11 },
        { num: 2, word: 'TERMS', r: 0, c: 14 },
        { num: 4, word: 'LUXURIES', r: 2, c: 8 },
        { num: 5, word: 'HEIGHT', r: 2, c: 24 },
        { num: 6, word: 'DELIVER', r: 3, c: 18 },
        { num: 7, word: 'LOCATE', r: 4, c: 5 },
        { num: 10, word: 'OCCASIONS', r: 5, c: 13 },
        { num: 13, word: 'FITS', r: 8, c: 21 },
        { num: 16, word: 'SUPPLY', r: 9, c: 23 },
        { num: 17, word: 'FUSS', r: 10, c: 9 },
        { num: 19, word: 'FACILITY', r: 11, c: 3 },
        { num: 20, word: 'GUARANTEE', r: 11, c: 7 },
        { num: 21, word: 'CIVILIZATION', r: 11, c: 11 },
        { num: 22, word: 'CURRENT', r: 12, c: 0 },
        { num: 25, word: 'ALTERNATIVE', r: 12, c: 15 },
        { num: 26, word: 'EXCHANGE', r: 13, c: 20 },
        { num: 28, word: 'TRICKS', r: 14, c: 5 },
        { num: 31, word: 'REPLACED', r: 16, c: 9 },
        { num: 32, word: 'SCRIPT', r: 17, c: 13 },
        { num: 33, word: 'PREVIOUS', r: 17, c: 18 },
        { num: 34, word: 'DESTINY', r: 17, c: 23 },
      ];

      for (const item of across) {
        const wid = `w_${item.word}_${item.num}`;
        for (let i = 0; i < item.word.length; i++) {
          const cell = cells[item.r][item.c + i];
          cell.letter = item.word[i];
          cell.isBlack = false;
          cell.acrossWordId = wid;
          if (i === 0) cell.acrossNumber = item.num;
        }
      }

      for (const item of down) {
        const wid = `w_${item.word}_${item.num}`;
        for (let i = 0; i < item.word.length; i++) {
          const cell = cells[item.r + i][item.c];
          cell.letter = item.word[i];
          cell.isBlack = false;
          cell.downWordId = wid;
          if (i === 0) cell.downNumber = item.num;
        }
      }

      return cells;
    })(),
    placedWords: [
      { id: 'w_FLAVOR_3', word: 'FLAVOR', japanese: '抹茶味のアイスクリーム', sentence: 'ice cream with a green tea (    )', row: 2, col: 7, direction: 'across', number: 3 },
      { id: 'w_DIVORCE_6', word: 'DIVORCE', japanese: '妻と離婚する', sentence: '(    ) my wife', row: 3, col: 18, direction: 'across', number: 6 },
      { id: 'w_SPARE_8', word: 'SPARE', japanese: '出費を惜しまない', sentence: '(    ) no expense', row: 4, col: 14, direction: 'across', number: 8 },
      { id: 'w_CONSULT_9', word: 'CONSULT', japanese: '医者に診てもらいなさい。', sentence: "You'd better (    ) your doctor.", row: 5, col: 4, direction: 'across', number: 9 },
      { id: 'w_CLASSICAL_11', word: 'CLASSICAL', japanese: 'クラシック音楽', sentence: '(    ) music', row: 6, col: 13, direction: 'across', number: 11 },
      { id: 'w_TEMPORARY_12', word: 'TEMPORARY', japanese: '仮免許', sentence: 'a (    ) license', row: 8, col: 7, direction: 'across', number: 12 },
      { id: 'w_FATE_14', word: 'FATE', japanese: '恐ろしい運命が彼らを待ち受けていた。', sentence: 'A terrible (    ) awaited them.', row: 9, col: 2, direction: 'across', number: 14 },
      { id: 'w_CREDITS_15', word: 'CREDITS', japanese: '授業に出るだけでは単位はもらえない', sentence: 'cannot get (    ) simply by attending class', row: 9, col: 17, direction: 'across', number: 15 },
      { id: 'w_WIPED_18', word: 'WIPED', japanese: '村全体が竜巻によって壊滅させられた。', sentence: 'The entire village was (    ) out by the tornado.', row: 10, col: 12, direction: 'across', number: 18 },
      { id: 'w_NAP_23', word: 'NAP', japanese: '昼食後に昼寝をする', sentence: '(    ) after lunch', row: 12, col: 2, direction: 'across', number: 23 },
      { id: 'w_QUESTIONNAIRE_24', word: 'QUESTIONNAIRE', japanese: 'アンケート調査', sentence: 'a survey using a (    )', row: 12, col: 6, direction: 'across', number: 24 },
      { id: 'w_REGISTER_27', word: 'REGISTER', japanese: 'クラス名簿', sentence: 'a class (    )', row: 14, col: 0, direction: 'across', number: 27 },
      { id: 'w_DYE_29', word: 'DYE', japanese: '酸性染料', sentence: 'an acid (    )', row: 14, col: 22, direction: 'across', number: 29 },
      { id: 'w_EMERGENCY_30', word: 'EMERGENCY', japanese: '救急処置室', sentence: 'an (    ) room', row: 15, col: 13, direction: 'across', number: 30 },
      { id: 'w_LITERATURE_35', word: 'LITERATURE', japanese: 'ノーベル文学賞', sentence: 'the Nobel Prize in (    )', row: 19, col: 9, direction: 'across', number: 35 },
      { id: 'w_PORTIONS_36', word: 'PORTIONS', japanese: 'スパゲッティを2人前食べる', sentence: 'eat two (    ) of spaghetti', row: 22, col: 17, direction: 'across', number: 36 },
      { id: 'w_ENCLOSED_37', word: 'ENCLOSED', japanese: '高い塀に囲まれている', sentence: 'be (    ) by high walls', row: 24, col: 13, direction: 'across', number: 37 },
      { id: 'w_GOODS_1', word: 'GOODS', japanese: '抗菌グッズ', sentence: 'antibacterial (    )', row: 0, col: 11, direction: 'down', number: 1 },
      { id: 'w_TERMS_2', word: 'TERMS', japanese: '離婚後も彼女と良好な関係にある。', sentence: 'I am on good (    ) with her after our divorce.', row: 0, col: 14, direction: 'down', number: 2 },
      { id: 'w_LUXURIES_4', word: 'LUXURIES', japanese: 'ぜいたく品に多額のお金を使う', sentence: 'spend a lot of money on (    )', row: 2, col: 8, direction: 'down', number: 4 },
      { id: 'w_HEIGHT_5', word: 'HEIGHT', japanese: '身長順に並ぶ', sentence: 'line up in order of (    )', row: 2, col: 24, direction: 'down', number: 5 },
      { id: 'w_DELIVER_6', word: 'DELIVER', japanese: 'ピザを配達する', sentence: '(    ) pizzas', row: 3, col: 18, direction: 'down', number: 6 },
      { id: 'w_LOCATE_7', word: 'LOCATE', japanese: '地図でレストランの場所を見つける', sentence: '(    ) the restaurant on the map', row: 4, col: 5, direction: 'down', number: 7 },
      { id: 'w_OCCASIONS_10', word: 'OCCASIONS', japanese: 'その服を特別な行事のためにとっておく', sentence: 'keep the dress for special (    )', row: 5, col: 13, direction: 'down', number: 10 },
      { id: 'w_FITS_13', word: 'FITS', japanese: 'このワンピースは（サイズが）君にぴったりだ。', sentence: 'This dress (    ) you.', row: 8, col: 21, direction: 'down', number: 13 },
      { id: 'w_SUPPLY_16', word: 'SUPPLY', japanese: '需要と供給', sentence: '(    ) and demand', row: 9, col: 23, direction: 'down', number: 16 },
      { id: 'w_FUSS_17', word: 'FUSS', japanese: 'くだらないことで大騒ぎする', sentence: 'make a (    ) about trivial things', row: 10, col: 9, direction: 'down', number: 17 },
      { id: 'w_FACILITY_19', word: 'FACILITY', japanese: '語学のすぐれた才能がある', sentence: 'have a great (    ) for language', row: 11, col: 3, direction: 'down', number: 19 },
      { id: 'w_GUARANTEE_20', word: 'GUARANTEE', japanese: '1年間の保証つきパソコン', sentence: 'a PC with a one-year (    )', row: 11, col: 7, direction: 'down', number: 20 },
      { id: 'w_CIVILIZATION_21', word: 'CIVILIZATION', japanese: '高度な文明', sentence: 'an advanced (    )', row: 11, col: 11, direction: 'down', number: 21 },
      { id: 'w_CURRENT_22', word: 'CURRENT', japanese: '10アンペアの電流', sentence: 'a 10 amp electrical (    )', row: 12, col: 0, direction: 'down', number: 22 },
      { id: 'w_ALTERNATIVE_25', word: 'ALTERNATIVE', japanese: 'ほかの選択肢がない。', sentence: 'There is no other (    ).', row: 12, col: 15, direction: 'down', number: 25 },
      { id: 'w_EXCHANGE_26', word: 'EXCHANGE', japanese: '交換プログラムで留学する', sentence: 'go abroad on a student (    ) program', row: 13, col: 20, direction: 'down', number: 26 },
      { id: 'w_TRICKS_28', word: 'TRICKS', japanese: '出世のために小細工をする', sentence: 'use cheap (    ) to get promoted', row: 14, col: 5, direction: 'down', number: 28 },
      { id: 'w_REPLACED_31', word: 'REPLACED', japanese: '人工知能が多くの分野で人間に取って代わった。', sentence: 'AI has (    ) humans in many fields.', row: 16, col: 9, direction: 'down', number: 31 },
      { id: 'w_SCRIPT_32', word: 'SCRIPT', japanese: 'アラビア文字で', sentence: 'in Arabic (    )', row: 17, col: 13, direction: 'down', number: 32 },
      { id: 'w_PREVIOUS_33', word: 'PREVIOUS', japanese: '（ある日の）前の朝', sentence: 'the (    ) morning', row: 17, col: 18, direction: 'down', number: 33 },
      { id: 'w_DESTINY_34', word: 'DESTINY', japanese: '国を救うことが彼の運命だった。', sentence: 'It was his (    ) to save his nation.', row: 17, col: 23, direction: 'down', number: 34 },
    ],
    unplacedWords: [],
  },
  words: [
    { id: 'w_FLAVOR_3', word: 'FLAVOR', japanese: '抹茶味のアイスクリーム', sentence: 'ice cream with a green tea (    )' },
    { id: 'w_DIVORCE_6', word: 'DIVORCE', japanese: '妻と離婚する', sentence: '(    ) my wife' },
    { id: 'w_SPARE_8', word: 'SPARE', japanese: '出費を惜しまない', sentence: '(    ) no expense' },
    { id: 'w_CONSULT_9', word: 'CONSULT', japanese: '医者に診てもらいなさい。', sentence: "You'd better (    ) your doctor." },
    { id: 'w_CLASSICAL_11', word: 'CLASSICAL', japanese: 'クラシック音楽', sentence: '(    ) music' },
    { id: 'w_TEMPORARY_12', word: 'TEMPORARY', japanese: '仮免許', sentence: 'a (    ) license' },
    { id: 'w_FATE_14', word: 'FATE', japanese: '恐ろしい運命が彼らを待ち受けていた。', sentence: 'A terrible (    ) awaited them.' },
    { id: 'w_CREDITS_15', word: 'CREDITS', japanese: '授業に出るだけでは単位はもらえない', sentence: 'cannot get (    ) simply by attending class' },
    { id: 'w_WIPED_18', word: 'WIPED', japanese: '村全体が竜巻によって壊滅させられた。', sentence: 'The entire village was (    ) out by the tornado.' },
    { id: 'w_NAP_23', word: 'NAP', japanese: '昼食後に昼寝をする', sentence: '(    ) after lunch' },
    { id: 'w_QUESTIONNAIRE_24', word: 'QUESTIONNAIRE', japanese: 'アンケート調査', sentence: 'a survey using a (    )' },
    { id: 'w_REGISTER_27', word: 'REGISTER', japanese: 'クラス名簿', sentence: 'a class (    )' },
    { id: 'w_DYE_29', word: 'DYE', japanese: '酸性染料', sentence: 'an acid (    )' },
    { id: 'w_EMERGENCY_30', word: 'EMERGENCY', japanese: '救急処置室', sentence: 'an (    ) room' },
    { id: 'w_LITERATURE_35', word: 'LITERATURE', japanese: 'ノーベル文学賞', sentence: 'the Nobel Prize in (    )' },
    { id: 'w_PORTIONS_36', word: 'PORTIONS', japanese: 'スパゲッティを2人前食べる', sentence: 'eat two (    ) of spaghetti' },
    { id: 'w_ENCLOSED_37', word: 'ENCLOSED', japanese: '高い塀に囲まれている', sentence: 'be (    ) by high walls' },
    { id: 'w_GOODS_1', word: 'GOODS', japanese: '抗菌グッズ', sentence: 'antibacterial (    )' },
    { id: 'w_TERMS_2', word: 'TERMS', japanese: '離婚後も彼女と良好な関係にある。', sentence: 'I am on good (    ) with her after our divorce.' },
    { id: 'w_LUXURIES_4', word: 'LUXURIES', japanese: 'ぜいたく品に多額のお金を使う', sentence: 'spend a lot of money on (    )' },
    { id: 'w_HEIGHT_5', word: 'HEIGHT', japanese: '身長順に並ぶ', sentence: 'line up in order of (    )' },
    { id: 'w_DELIVER_6', word: 'DELIVER', japanese: 'ピザを配達する', sentence: '(    ) pizzas' },
    { id: 'w_LOCATE_7', word: 'LOCATE', japanese: '地図でレストランの場所を見つける', sentence: '(    ) the restaurant on the map' },
    { id: 'w_OCCASIONS_10', word: 'OCCASIONS', japanese: 'その服を特別な行事のためにとっておく', sentence: 'keep the dress for special (    )' },
    { id: 'w_FITS_13', word: 'FITS', japanese: 'このワンピースは（サイズが）君にぴったりだ。', sentence: 'This dress (    ) you.' },
    { id: 'w_SUPPLY_16', word: 'SUPPLY', japanese: '需要と供給', sentence: '(    ) and demand' },
    { id: 'w_FUSS_17', word: 'FUSS', japanese: 'くだらないことで大騒ぎする', sentence: 'make a (    ) about trivial things' },
    { id: 'w_FACILITY_19', word: 'FACILITY', japanese: '語学のすぐれた才能がある', sentence: 'have a great (    ) for language' },
    { id: 'w_GUARANTEE_20', word: 'GUARANTEE', japanese: '1年間の保証つきパソコン', sentence: 'a PC with a one-year (    )' },
    { id: 'w_CIVILIZATION_21', word: 'CIVILIZATION', japanese: '高度な文明', sentence: 'an advanced (    )' },
    { id: 'w_CURRENT_22', word: 'CURRENT', japanese: '10アンペアの電流', sentence: 'a 10 amp electrical (    )' },
    { id: 'w_ALTERNATIVE_25', word: 'ALTERNATIVE', japanese: 'ほかの選択肢がない。', sentence: 'There is no other (    ).' },
    { id: 'w_EXCHANGE_26', word: 'EXCHANGE', japanese: '交換プログラムで留学する', sentence: 'go abroad on a student (    ) program' },
    { id: 'w_TRICKS_28', word: 'TRICKS', japanese: '出世のために小細工をする', sentence: 'use cheap (    ) to get promoted' },
    { id: 'w_REPLACED_31', word: 'REPLACED', japanese: '人工知能が多くの分野で人間に取って代わった。', sentence: 'AI has (    ) humans in many fields.' },
    { id: 'w_SCRIPT_32', word: 'SCRIPT', japanese: 'アラビア文字で', sentence: 'in Arabic (    )' },
    { id: 'w_PREVIOUS_33', word: 'PREVIOUS', japanese: '（ある日の）前の朝', sentence: 'the (    ) morning' },
    { id: 'w_DESTINY_34', word: 'DESTINY', japanese: '国を救うことが彼の運命だった。', sentence: 'It was his (    ) to save his nation.' },
  ],
};
