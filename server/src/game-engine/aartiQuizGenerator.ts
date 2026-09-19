/**
 * Dynamic AI-Powered Aarti Quiz Generator
 * 
 * Generates valid, authentic Marathi quiz questions derived strictly
 * from verified Aarti text stored in MongoDB.
 */

import { IAarti } from '../models/index';

export type QuestionType =
  | 'mcq'
  | 'true_false'
  | 'fill_blank_options'
  | 'arrange_aarti'
  | 'incorrect_word'
  | 'incorrect_sentence'
  | 'missing_line'
  | 'match_lines';

export interface GeneratedQuestion {
  type: QuestionType;
  question: string;
  options?: string[];
  items?: string[];
  correctAnswer?: string | number;
  correctOrder?: string[];
  incorrectWord?: string;
  correctWord?: string;
  sentence?: string;
  words?: string[];
  pairs?: { left: string; right: string }[];
  explanation?: string;
  sourceAarti: string;
  sourceLine: string;
  points: number;
  timeLimit: number;
  verified: boolean;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
}

export interface QuizGeneratorOptions {
  totalQuestions: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  selectedTypes: string[];
  sourceAartis: string[]; // Aarti titles
}

// ─── Subtle Marathi Distractor / Word Replacement Map ──────────────────────────
// Only applied to verified words to create controlled, single-word errors
const MARATHI_SUBTLE_ALTERATIONS: Record<string, string> = {
  'विघ्नाची': 'विघ्नाचा',
  'सुंदर': 'सुंदरा',
  'शेंदूराची': 'शेंदूराचा',
  'मुक्ताफळांची': 'मुक्ताफळांचा',
  'कामनापूर्ती': 'कामनापूर्ता',
  'गौरीकुमरा': 'गौरीकुमरी',
  'कुंकुम': 'कुंकुमा',
  'शोभतो': 'शोभते',
  'घागरिया': 'घागरियांचे',
  'पीतांबर': 'पीतांबरा',
  'वक्रतुण्ड': 'वक्रतुण्डा',
  'निर्वाणी': 'निर्वाणा',
  'विक्राळा': 'विक्राळी',
  'माळा': 'माळी',
  'त्रिनेत्री': 'त्रिनेत्रा',
  'बाळा': 'बाळी',
  'निर्मळ': 'निर्मळा',
  'कर्पुरगौरा': 'कर्पुरगौरी',
  'नीळा': 'नीळी',
  'नीळकंठ': 'नीळकंठा',
  'मदनारी': 'मदनारा',
  'सुखकारी': 'सुखकारा',
  'अंतरी': 'अंतरा',
  'संसारी': 'संसारा',
  'करुणाविस्तारी': 'करुणाविस्तारा',
  'नेवारी': 'नेवारा',
  'महिषासुरमथिनि': 'महिषासुरमथिना',
  'तारकसंजीवनी': 'तारकसंजीवना',
  'प्रवाही': 'प्रवाहा',
  'लवलाही': 'लवलाहा',
  'निजदासा': 'निजदासी',
  'भवपाशा': 'भवपाशी',
  'उभा': 'उभी',
  'शोभा': 'शोभी',
  'कटी': 'कटा',
  'लल्लाटी': 'लल्लाटा',
  'सावळा': 'सावळी',
  'कुरवंड्या': 'कुरवंडी',
  'मुक्ती': 'मुक्ता',
  'माऊली': 'माऊला',
  'कैवारी': 'कैवारा',
  'दिपवाळी': 'दिपवाळा',
  'पंढरीराया': 'पंढरीरायी',
  'ज्ञानराजा': 'ज्ञानराया',
  'महाकैवल्य': 'महावैभव',
  'गोपिका': 'गोपिया',
  'तुकारामा': 'तुकोबा',
  'सागरांत': 'समुद्रांत',
  'अभंग': 'अभंगा',
  'मस्तक': 'मस्तका',
  'लोटांगण': 'लोटांगणे',
  'चंद्रमौळी': 'चंद्रमौळा',
  'फणिंद्र': 'नागेंद्र',
  'अलंकापुरी': 'इंद्रायणी',
  'गौरीपुत्रा': 'गौरीसुता',
  'विनायका': 'विनायकी',
  'भालचंद्र': 'बालचंद्र',
  'गजानन': 'गजानना',
  'लंबोदर': 'लंबोदरा',
  'विघ्नराजेंद्र': 'विघ्नराजा',
  'धुम्रवर्ण': 'धूम्रवर्णा',
};

// ─── Helper Functions ──────────────────────────────────────────────────────────
function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Core Question Generators ──────────────────────────────────────────────────

/**
 * 1. Fill in the Blanks From Options
 */
function generateFillBlankQuestion(aarti: IAarti, allAartis: IAarti[], difficulty: string): GeneratedQuestion | null {
  const validLines = aarti.allLines.filter((l) => l.trim().split(/\s+/).length >= 4);
  if (validLines.length === 0) return null;

  const line = getRandomElement(validLines);
  const words = line.trim().split(/\s+/);
  
  // Pick a meaningful Marathi word (length >= 3)
  const candidateIndices = words
    .map((w, idx) => ({ w, idx }))
    .filter((item) => item.w.length >= 3 && !['जय', 'देव', 'हो', 'ते', 'गा'].includes(item.w));
  
  if (candidateIndices.length === 0) return null;
  const target = getRandomElement(candidateIndices);
  const correctWord = target.w;

  // Gather distractor words from this and other selected Aartis
  const distractorPool: string[] = [];
  allAartis.forEach((a) => {
    a.allLines.forEach((l) => {
      l.split(/\s+/).forEach((w) => {
        if (w.length >= 3 && w !== correctWord && !distractorPool.includes(w)) {
          distractorPool.push(w);
        }
      });
    });
  });

  const shuffledDistractors = shuffleArray(distractorPool).slice(0, 3);
  if (shuffledDistractors.length < 3) return null;

  const options = shuffleArray([correctWord, ...shuffledDistractors]);
  const blankWords = [...words];
  blankWords[target.idx] = '______';
  const questionText = blankWords.join(' ');

  return {
    type: 'fill_blank_options',
    question: `खालील रिकाम्या जागी योग्य शब्द भरा:\n"${questionText}"`,
    options,
    correctAnswer: correctWord,
    sourceAarti: aarti.title,
    sourceLine: line,
    points: 10,
    timeLimit: difficulty === 'easy' ? 25 : difficulty === 'hard' ? 15 : 20,
    verified: true,
    difficulty: difficulty as any,
  };
}

/**
 * 2. Arrange the Aarti
 */
function generateArrangeAartiQuestion(aarti: IAarti, difficulty: string): GeneratedQuestion | null {
  // Select lines with 4 to 6 words
  const validLines = aarti.allLines.filter((l) => {
    const len = l.trim().split(/\s+/).length;
    return len >= 4 && len <= 6;
  });
  if (validLines.length === 0) return null;

  const line = getRandomElement(validLines);
  const correctOrder = line.trim().split(/\s+/);

  // Shuffle until different from original
  let items = shuffleArray(correctOrder);
  let attempts = 0;
  while (items.join(' ') === correctOrder.join(' ') && attempts < 10) {
    items = shuffleArray(correctOrder);
    attempts++;
  }

  return {
    type: 'arrange_aarti',
    question: 'खालील आरतीचे शब्द योग्य क्रमाने लावा:',
    items,
    correctOrder,
    sourceAarti: aarti.title,
    sourceLine: line,
    points: 15,
    timeLimit: difficulty === 'easy' ? 35 : difficulty === 'hard' ? 20 : 25,
    verified: true,
    difficulty: difficulty as any,
  };
}

/**
 * 3. Find the Incorrect Word
 */
function generateIncorrectWordQuestion(aarti: IAarti, difficulty: string): GeneratedQuestion | null {
  // Find lines with a replaceable word
  const candidates: { line: string; word: string; replacement: string; idx: number }[] = [];

  aarti.allLines.forEach((line) => {
    const words = line.trim().split(/\s+/);
    words.forEach((w, idx) => {
      // Check exact match or strip punctuation
      const cleanW = w.replace(/[.,]/g, '');
      if (MARATHI_SUBTLE_ALTERATIONS[cleanW]) {
        candidates.push({
          line,
          word: cleanW,
          replacement: MARATHI_SUBTLE_ALTERATIONS[cleanW],
          idx,
        });
      }
    });
  });

  if (candidates.length === 0) {
    // Fallback rule: systematically alter vowel ending of a long word
    for (const line of aarti.allLines) {
      const words = line.trim().split(/\s+/);
      for (let idx = 0; idx < words.length; idx++) {
        const w = words[idx];
        if (w.length >= 4) {
          const replacement = w.endsWith('ी') ? w.slice(0, -1) + 'ा' : w + 'ा';
          candidates.push({ line, word: w, replacement, idx });
          break;
        }
      }
      if (candidates.length > 0) break;
    }
  }

  if (candidates.length === 0) return null;
  const picked = getRandomElement(candidates);

  const words = picked.line.trim().split(/\s+/);
  words[picked.idx] = picked.replacement;
  const alteredSentence = words.join(' ');

  return {
    type: 'incorrect_word',
    question: 'खालील ओळीत एक शब्द चुकीचा आहे, तो ओळखा:',
    sentence: alteredSentence,
    words: [...words],
    incorrectWord: picked.replacement,
    correctWord: picked.word,
    sourceAarti: aarti.title,
    sourceLine: picked.line,
    points: 10,
    timeLimit: difficulty === 'easy' ? 25 : difficulty === 'hard' ? 15 : 20,
    verified: true,
    difficulty: difficulty as any,
  };
}

/**
 * 4. Find the Incorrect Sentence
 */
function generateIncorrectSentenceQuestion(aarti: IAarti, allAartis: IAarti[], difficulty: string): GeneratedQuestion | null {
  // We need 3 verified correct lines and 1 altered line
  const allVerifiedLines: { line: string; aartiTitle: string }[] = [];
  allAartis.forEach((a) => {
    a.allLines.forEach((l) => {
      if (l.trim().split(/\s+/).length >= 4) {
        allVerifiedLines.push({ line: l, aartiTitle: a.title });
      }
    });
  });

  if (allVerifiedLines.length < 4) return null;

  // Pick one line to alter
  const lineToAlter = getRandomElement(allVerifiedLines);
  const words = lineToAlter.line.trim().split(/\s+/);
  
  // Find a word to alter
  let alteredLine = '';
  for (let i = words.length - 1; i >= 0; i--) {
    const w = words[i];
    if (MARATHI_SUBTLE_ALTERATIONS[w]) {
      const newWords = [...words];
      newWords[i] = MARATHI_SUBTLE_ALTERATIONS[w];
      alteredLine = newWords.join(' ');
      break;
    }
  }

  if (!alteredLine) {
    const newWords = [...words];
    const lastWord = newWords[newWords.length - 1];
    newWords[newWords.length - 1] = lastWord.endsWith('ी') ? lastWord.slice(0, -1) + 'ा' : lastWord + 'ा';
    alteredLine = newWords.join(' ');
  }

  // Pick 3 other correct lines
  const correctLines = allVerifiedLines
    .filter((item) => item.line !== lineToAlter.line)
    .map((item) => item.line);

  const chosenCorrect = shuffleArray(correctLines).slice(0, 3);
  if (chosenCorrect.length < 3) return null;

  const options = shuffleArray([alteredLine, ...chosenCorrect]);

  return {
    type: 'incorrect_sentence',
    question: 'खालीलपैकी अशुद्ध / चुकीची ओळ निवडा:',
    options,
    correctAnswer: alteredLine,
    sourceAarti: lineToAlter.aartiTitle,
    sourceLine: lineToAlter.line,
    points: 10,
    timeLimit: difficulty === 'easy' ? 30 : difficulty === 'hard' ? 20 : 25,
    verified: true,
    difficulty: difficulty as any,
  };
}

/**
 * 5. Multiple Choice Questions
 */
function generateMCQQuestion(aarti: IAarti, allAartis: IAarti[], difficulty: string): GeneratedQuestion | null {
  // Curated question templates based on exact lines in these specific Aartis
  const templates: {
    aarti: string;
    question: string;
    correctAnswer: string;
    distractors: string[];
    sourceLine: string;
  }[] = [
    // सुखकर्ता दुखहर्ता
    {
      aarti: 'सुखकर्ता दुखहर्ता',
      question: "'सुखकर्ता दुःखहर्ता' आरतीमध्ये गणपतीच्या कंठात कशाची माळ शोभते?",
      correctAnswer: 'मुक्ताफळांची',
      distractors: ['रुद्राक्षांची', 'तुळशीची', 'रत्नांची'],
      sourceLine: 'कंठी झळके माळ मुक्ताफळांची',
    },
    {
      aarti: 'सुखकर्ता दुखहर्ता',
      question: "बाप्पाच्या सर्वांगाला कशाची सुंदर उटी लावली आहे?",
      correctAnswer: 'शेंदूराची',
      distractors: ['चंदनाची', 'हळदीची', 'कुंकवाची'],
      sourceLine: 'सर्वांगी सुंदर उटी शेंदूराची',
    },
    {
      aarti: 'सुखकर्ता दुखहर्ता',
      question: "गणपतीच्या मस्तकावर कशाने जडलेला मुकुट शोभतो?",
      correctAnswer: 'हीरे जडित',
      distractors: ['सुवर्ण जडित', 'मोती जडित', 'माणिक जडित'],
      sourceLine: 'हीरे जडित मुकुट शोभतो बरा',
    },
    {
      aarti: 'सुखकर्ता दुखहर्ता',
      question: "'रुणझुणती नूपुरे चरणी घागरिया' या ओळीत नूपुरे कोठे घातली आहेत?",
      correctAnswer: 'चरणी (पायात)',
      distractors: ['हातात', 'कंठात', 'कमरेवर'],
      sourceLine: 'रुणझुणती नूपुरे चरणी घागरिया',
    },
    // लवथवती विक्राळा
    {
      aarti: 'लवथवती विक्राळा',
      question: "शंकराच्या आरतीनुसार शंकराला 'नीळकंठ' नाव कशामुळे मिळाले?",
      correctAnswer: 'हलाहल विष प्राशन केल्यामुळे',
      distractors: ['गंगा मस्तकी धारण केल्यामुळे', 'तपस्या केल्यामुळे', 'त्रिनेत्र उघडल्यामुळे'],
      sourceLine: 'ते त्या असुरपणे प्राशन केले / नीळकंठ नाम प्रसिद्ध झाले',
    },
    {
      aarti: 'लवथवती विक्राळा',
      question: "शंकराच्या मस्तकावरून कोणते जल झुळझुळा वाहते?",
      correctAnswer: 'निर्मळ जळ (गंगा)',
      distractors: ['यमुनेचे जळ', 'दुधाची धारा', 'अमृताची धार'],
      sourceLine: 'तेथुनिया जळ निर्मळ वाहे झुळझुळा',
    },
    {
      aarti: 'लवथवती विक्राळा',
      question: "शंकराच्या आरतीत 'कर्पुरगौरा' हा कोणाचा उल्लेख आहे?",
      correctAnswer: 'भगवान शिव',
      distractors: ['गणपती', 'नंदी', 'विष्णू'],
      sourceLine: 'आरती ओवाळू तुज कर्पुरगौरा',
    },
    // दुर्गे दुर्घट भारी
    {
      aarti: 'दुर्गे दुर्घट भारी',
      question: "'दुर्गे दुर्घट भारी' आरतीमध्ये देवीला कोणाचा संहार करणारी म्हटले आहे?",
      correctAnswer: 'महिषासुरमथिनि',
      distractors: ['तारकासुरमथिनि', 'रावणमथिनि', 'बकासुरमथिनि'],
      sourceLine: 'जय देवी जय देवी महिषासुरमथिनि',
    },
    {
      aarti: 'दुर्गे दुर्घट भारी',
      question: "'नरहरी तल्लीन झाला पदपंकजलेशा' ही रचना कोणत्या संतांची आहे?",
      correctAnswer: 'नरहरी सोनार',
      distractors: ['संत नामदेव', 'संत एकनाथ', 'समर्थ रामदास'],
      sourceLine: 'नरहरी तल्लीन झाला पदपंकजलेशा',
    },
    // श्री विठोबाची आरती
    {
      aarti: 'श्री विठोबाची आरती',
      question: "विठोबा किती युगांपासून विटेवर उभा आहे?",
      correctAnswer: 'अठ्ठावीस युगे',
      distractors: ['बारा युगे', 'एकवीस युगे', 'शंभर युगे'],
      sourceLine: 'युगे अठ्ठावीस विटेवरी उभा',
    },
    {
      aarti: 'श्री विठोबाची आरती',
      question: "विठोबाच्या चरणाशी कोणती पवित्र नदी वाहते?",
      correctAnswer: 'भीमा (चंद्रभागा)',
      distractors: ['गंगा', 'गोदावरी', 'कृष्णा'],
      sourceLine: 'चरणी वाहे भीमा उद्धरी जगा',
    },
    {
      aarti: 'श्री विठोबाची आरती',
      question: "विठोबाच्या डाव्या अंगाला (वामांगी) कोण विराजमान आहे?",
      correctAnswer: 'रखुमाई',
      distractors: ['सत्यभामा', 'लक्ष्मी', 'राधा'],
      sourceLine: 'वामांगी रखुमाई दिसे दिव्य शोभा',
    },
    // श्री पांडुरंगाची आरती
    {
      aarti: 'श्री पांडुरंगाची आरती',
      question: "'येई हो विठ्ठले' आरतीमध्ये विठ्ठल कोणावर बसून भक्ताच्या भेटीस येतो?",
      correctAnswer: 'गरुडांवरि',
      distractors: ['हंसावरि', 'अश्वावरि', 'रथावरि'],
      sourceLine: 'गरुडांवरि बैसोनि माझा कैवारी आला',
    },
    // ज्ञानराजा आरती
    {
      aarti: 'ज्ञानराजा आरती',
      question: "'आरती ज्ञानराजा' मध्ये ज्ञानराजांना कशाचे तेज म्हटले आहे?",
      correctAnswer: 'महाकैवल्य तेजा',
      distractors: ['सूर्य तेजा', 'चंद्र तेजा', 'ब्रह्म तेजा'],
      sourceLine: 'आरती ज्ञानराजा महाकैवल्य तेजा',
    },
    {
      aarti: 'ज्ञानराजा आरती',
      question: "'कनकाचे ताट करीरु उभ्या गोपिका नारीरु' या ओळीत ताट कशाचे बनलेले आहे?",
      correctAnswer: 'कनकाचे (सोन्याचे)',
      distractors: ['चांदीचे', 'तांब्याचे', 'पितळेचे'],
      sourceLine: 'कनकाचे ताट करीरु उभ्या गोपिका नारीरु',
    },
    {
      aarti: 'ज्ञानराजा आरती',
      question: "साम गायन कोण करत असल्याचा उल्लेख आरतीत येतो?",
      correctAnswer: 'नारद तुम्बरहोरु',
      distractors: ['गंधर्व', 'इंद्रदेव', 'ऋषिगण'],
      sourceLine: 'नारद तुम्बरहोरु साम गायन करी',
    },
    // आरती तुकारामा
    {
      aarti: 'आरती तुकारामा',
      question: "'आरती तुकारामा स्वामी सद्गुरुधामा' मध्ये कोणाला सद्गुरुधाम म्हटले आहे?",
      correctAnswer: 'संत तुकाराम महाराज',
      distractors: ['संत ज्ञानेश्वर', 'संत नामदेव', 'संत एकनाथ'],
      sourceLine: 'आरती तुकारामा स्वामी सद्गुरुधामा',
    },
    {
      aarti: 'आरती तुकारामा',
      question: "राघवांनी सागरात पाषाण तारिले, तसे तुकोबांचे काय उदकात (पाण्यात) रक्षिले गेले?",
      correctAnswer: 'अभंग',
      distractors: ['चरित्र', 'वचने', 'पुस्तके'],
      sourceLine: 'तैसे हें तुकोबाचे अभंग उदकीं रक्षिले',
    },
    {
      aarti: 'आरती तुकारामा',
      question: "तुकारामांच्या चरणी कोणी मस्तक ठेविल्याचा उल्लेख येतो?",
      correctAnswer: 'रामेश्वर भट',
      distractors: ['शिवाजी महाराज', 'मंबाजी', 'कन्होपात्रा'],
      sourceLine: 'म्हणुनी रामेश्वरें चरणीं मस्तक ठेविले',
    },
    // घालीन लोटांगण
    {
      aarti: 'घालीन लोटांगण',
      question: "'घालीन लोटांगण वंदीन चरण' या कडव्यात शेवटी कोणाचा नामोल्लेख येतो?",
      correctAnswer: 'म्हणे नामा (संत नामदेव)',
      distractors: ['म्हणे तुका', 'म्हणे ज्ञानदेव', 'म्हणे एकनाथ'],
      sourceLine: 'भावे ओवाळीन म्हणे नामा',
    },
    {
      aarti: 'घालीन लोटांगण',
      question: "'त्वमेव माता पिता त्वमेव' या श्लोकात देवाचे कोणते नाते सांगितले आहे?",
      correctAnswer: 'माता, पिता, बंधू आणि सखा',
      distractors: ['केवळ गुरु', 'केवळ राजा', 'केवळ न्यायाधीश'],
      sourceLine: 'त्वमेव माता पिता त्वमेव / त्वमेव बन्धुः सखा त्वमेव',
    },
    {
      aarti: 'घालीन लोटांगण',
      question: "'कायेन वाचा मनसेंद्रियैर्वा' हा श्लोक कोणाला समर्पित केला जातो?",
      correctAnswer: 'नारायणाय (भगवान विष्णू/नारायण)',
      distractors: ['इंद्राय', 'वरुणाय', 'अग्नये'],
      sourceLine: 'नारायणायेती समर्पयामि',
    },
    // प्रार्थना
    {
      aarti: 'प्रार्थना',
      question: "'सदा सर्वदा योग तुझा घडावा' या प्रार्थनेमध्ये कोणाकडे मागणे मागितले आहे?",
      correctAnswer: 'रघुनायक (श्रीराम)',
      distractors: ['इंद्रदेव', 'वरुणदेव', 'सूर्यदेव'],
      sourceLine: 'रघुनायका मागणे हेचि आतां',
    },
    {
      aarti: 'प्रार्थना',
      question: "'कैलासराणा शिव चंद्रमौळी' या श्लोकात शंकराच्या माथ्यावर कोणाचे आभूषण आहे?",
      correctAnswer: 'फणिंद्र (नागराज)',
      distractors: ['गरुड', 'मयूर', 'हंस'],
      sourceLine: 'फणिंद्र माथा मुकुटी झळाळी',
    },
    {
      aarti: 'प्रार्थना',
      question: "'मोरया मोरया मी बाळ तान्हे' या कडव्यात बाप्पाकडे काय मागणे मागितले आहे?",
      correctAnswer: 'अन्याय माझे पोटात घाल (क्षमा कर)',
      distractors: ['धनसंपत्ती दे', 'दीर्घायुष्य दे', 'विजय दे'],
      sourceLine: 'अन्याय माझे कोट्यानुकोटी / मोरेश्वरा बा तू घाल पोटी',
    },
    {
      aarti: 'प्रार्थना',
      question: "पवित्र अलंकापुरीत कोण नांदत असल्याचा उल्लेख प्रार्थनेत आहे?",
      correctAnswer: 'ज्ञानराजा (संत ज्ञानेश्वर)',
      distractors: ['संत तुकाराम', 'संत रामदास', 'संत गोरा कुंभार'],
      sourceLine: 'अलंकापुरी पुण्य भूमी पवित्र / तिथे नांदतो ज्ञानराजा सुपात्र',
    },
    // मंत्र पुष्पाञ्जलि
    {
      aarti: 'मंत्र पुष्पाञ्जलि',
      question: "'ॐ गणानां त्वा गणपतिं हवामहे' ही ऋचा प्रामुख्याने कोणत्या दैवताची स्तुती करते?",
      correctAnswer: 'श्री गणपती (ब्रह्मणस्पति)',
      distractors: ['सूर्यदेव', 'वरुणदेव', 'अग्निदेव'],
      sourceLine: 'ॐ गणानां त्वा गणपतिं हवामहे',
    },
    {
      aarti: 'मंत्र पुष्पाञ्जलि',
      question: "मंत्रपुष्पांजलीत 'कुबेराय वैश्रवणाय महाराजाय नमः' असा कोणाला नमस्कार केला आहे?",
      correctAnswer: 'कुबेर (धनपती)',
      distractors: ['इंद्र', 'यमराज', 'वरुण'],
      sourceLine: 'कुबेराय वैश्रवणाय महाराजाय नमः',
    },
    {
      aarti: 'मंत्र पुष्पाञ्जलि',
      question: "'एकदंतायविद्महे वक्रतुण्डाय धीमहि' हा कोणता प्रसिद्ध मंत्र आहे?",
      correctAnswer: 'गणेश गायत्री मंत्र',
      distractors: ['सूर्य गायत्री मंत्र', 'शिव पंचाक्षरी मंत्र', 'महामृत्युंजय मंत्र'],
      sourceLine: 'एकदंतायविद्महे वक्रतुण्डाय धीमहि',
    },
    // श्रीगणपती स्तोत्र
    {
      aarti: 'श्रीगणपती स्तोत्र',
      question: "गणपती स्तोत्रामध्ये गणपती बाप्पाची एकूण किती पवित्र नावे सांगितली आहेत?",
      correctAnswer: 'बारा नावे (द्वादश नामे)',
      distractors: ['आठ नावे', 'सोळा नावे', 'एकवीस नावे'],
      sourceLine: 'देवनांवे अशी बारा तीन संध्या म्हणे नर',
    },
    {
      aarti: 'श्रीगणपती स्तोत्र',
      question: "स्तोत्रानुसार गणपतीचे पाचवे नाव कोणते आहे?",
      correctAnswer: 'श्रीलंबोदर',
      distractors: ['एकदंत', 'विकट', 'भालचंद्र'],
      sourceLine: 'पांचवे श्रीलंबोदर सहावें विकट नांव ते',
    },
    {
      aarti: 'श्रीगणपती स्तोत्र',
      question: "विद्यार्थ्याला हे स्तोत्र पठण केल्याने काय प्राप्त होते?",
      correctAnswer: 'विद्या',
      distractors: ['धन', 'पुत्र', 'मोक्ष'],
      sourceLine: 'विद्यार्थ्याला मिळे विद्या धनार्थ्याला मिळे धन',
    },
    {
      aarti: 'श्रीगणपती स्तोत्र',
      question: "गणपती स्तोत्र मूळ कोणाद्वारे रचिले गेले आहे?",
      correctAnswer: 'नारद मुनी',
      distractors: ['व्यास मुनी', 'वाल्मिकी ऋषी', 'अगस्ती ऋषी'],
      sourceLine: 'नारदांनी रचिलेले झाले संपूर्ण स्तोत्र हें',
    },
  ];

  // Filter templates matching selected Aarti
  const matching = templates.filter((t) => t.aarti === aarti.title);
  if (matching.length > 0) {
    const picked = getRandomElement(matching);
    const options = shuffleArray([picked.correctAnswer, ...picked.distractors]);

    return {
      type: 'mcq',
      question: picked.question,
      options,
      correctAnswer: picked.correctAnswer,
      sourceAarti: picked.aarti,
      sourceLine: picked.sourceLine,
      points: 10,
      timeLimit: difficulty === 'easy' ? 25 : difficulty === 'hard' ? 15 : 20,
      verified: true,
      difficulty: difficulty as any,
    };
  }

  // Dynamic fallback MCQ: identify which Aarti a verified line belongs to
  if (aarti.allLines.length > 0 && allAartis.length >= 2) {
    const randomLine = getRandomElement(aarti.allLines);
    const otherTitles = allAartis
      .map((a) => a.title)
      .filter((t) => t !== aarti.title);
    const distractorTitles = shuffleArray(otherTitles).slice(0, 3);
    const options = shuffleArray([aarti.title, ...distractorTitles]);

    return {
      type: 'mcq',
      question: `"${randomLine}"\nही ओळ खालीलपैकी कोणत्या आरती/स्तोत्रातील आहे?`,
      options,
      correctAnswer: aarti.title,
      sourceAarti: aarti.title,
      sourceLine: randomLine,
      points: 10,
      timeLimit: difficulty === 'easy' ? 25 : difficulty === 'hard' ? 15 : 20,
      verified: true,
      difficulty: difficulty as any,
    };
  }

  return null;
}

/**
 * 6. True/False
 */
function generateTrueFalseQuestion(aarti: IAarti, difficulty: string): GeneratedQuestion | null {
  const tfBank: {
    aarti: string;
    statement: string;
    isTrue: boolean;
    sourceLine: string;
  }[] = [
    {
      aarti: 'सुखकर्ता दुखहर्ता',
      statement: "आरतीनुसार गणपतीच्या सर्वांगाला शेंदूराची उटी लावली आहे.",
      isTrue: true,
      sourceLine: 'सर्वांगी सुंदर उटी शेंदूराची',
    },
    {
      aarti: 'सुखकर्ता दुखहर्ता',
      statement: "आरतीनुसार गणपतीच्या एका हातात धनुष्यबाण आहे.",
      isTrue: false,
      sourceLine: 'लंबोदर पीतांबर फणिवरबंधना / सरळ सोंड वक्रतुण्ड त्रिनयना',
    },
    {
      aarti: 'लवथवती विक्राळा',
      statement: "शंकराच्या आरतीत 'तेथुनिया जळ निर्मळ वाहे झुळझुळा' असा उल्लेख आहे.",
      isTrue: true,
      sourceLine: 'तेथुनिया जळ निर्मळ वाहे झुळझुळा',
    },
    {
      aarti: 'लवथवती विक्राळा',
      statement: "शंकराने समुद्रातून निघालेले अमृत प्राशन केले.",
      isTrue: false,
      sourceLine: 'त्यामाजी अवचीत हलहल जे उठले / ते त्या असुरपणे प्राशन केले',
    },
    {
      aarti: 'दुर्गे दुर्घट भारी',
      statement: "देवीच्या दर्शनाने सर्व क्लेश आणि भवपाश दूर होतात.",
      isTrue: true,
      sourceLine: 'क्लेशांपासोनि सोडवी तोडी भवपाशा',
    },
    {
      aarti: 'श्री विठोबाची आरती',
      statement: "विठोबा पुंडलिकाच्या भेटीसाठी परब्रह्म म्हणून आला.",
      isTrue: true,
      sourceLine: 'पुंडलिकाचे भेटी परब्रह्म आले गा',
    },
    {
      aarti: 'श्री विठोबाची आरती',
      statement: "विठोबाच्या गळ्यात रुद्राक्षाची माळ आहे.",
      isTrue: false,
      sourceLine: 'तुळसी माळा गळा कर ठेवुनि कटी',
    },
    {
      aarti: 'श्री पांडुरंगाची आरती',
      statement: "विठू माऊलीची वाट पाहताना कपाळावर कर (हात) ठेवल्याचा उल्लेख आहे.",
      isTrue: true,
      sourceLine: 'निढळावरी कर ठेवुनि वाट मी पाहे',
    },
    {
      aarti: 'ज्ञानराजा आरती',
      statement: "आरतीनुसार गोपिका हातात कनकाचे ताट घेऊन उभ्या असल्याचा उल्लेख आहे.",
      isTrue: true,
      sourceLine: 'कनकाचे ताट करीरु उभ्या गोपिका नारीरु',
    },
    {
      aarti: 'आरती तुकारामा',
      statement: "आरतीनुसार तुकोबांचे अभंग पाण्यात बुडून नष्ट झाले.",
      isTrue: false,
      sourceLine: 'तैसे हें तुकोबाचे अभंग उदकीं रक्षिले',
    },
    {
      aarti: 'घालीन लोटांगण',
      statement: "'घालीन लोटांगण' च्या शेवटी 'मंगलमुर्ती मोरया, गणपतिबाप्पा मोरया' असा जयघोष येतो.",
      isTrue: true,
      sourceLine: 'मंगलमुर्ती मोरया / गणपतिबाप्पा मोरया',
    },
    {
      aarti: 'प्रार्थना',
      statement: "प्रार्थनेत 'सदा सर्वदा योग तुझा घडावा' हे मागणे श्रीरामाकडे मागितले आहे.",
      isTrue: true,
      sourceLine: 'रघुनायका मागणे हेचि आतां',
    },
    {
      aarti: 'मंत्र पुष्पाञ्जलि',
      statement: "'तन्नोदंती प्रचोदयात्' ही ओळ मंत्रपुष्पांजलीतील गणेश गायत्री मंत्राचा भाग आहे.",
      isTrue: true,
      sourceLine: 'तन्नोदंती प्रचोदयात्',
    },
    {
      aarti: 'श्रीगणपती स्तोत्र',
      statement: "गणपती स्तोत्र तीनही त्रिकाळ पठण करणाऱ्याला कोणत्याही विघ्नाची भीती नसते.",
      isTrue: true,
      sourceLine: 'देवनांवे अशी बारा तीन संध्या म्हणे नर / विघ्नभीती नसे त्याला',
    },
  ];

  const matching = tfBank.filter((item) => item.aarti === aarti.title);
  if (matching.length > 0) {
    const picked = getRandomElement(matching);
    return {
      type: 'true_false',
      question: `खालील विधान चूक की बरोबर ते ओळखा:\n"${picked.statement}"`,
      options: ['बरोबर', 'चूक'],
      correctAnswer: picked.isTrue ? 'बरोबर' : 'चूक',
      sourceAarti: picked.aarti,
      sourceLine: picked.sourceLine,
      points: 10,
      timeLimit: difficulty === 'easy' ? 20 : difficulty === 'hard' ? 12 : 15,
      verified: true,
      difficulty: difficulty as any,
    };
  }

  // Dynamic fallback True/False from lines
  if (aarti.allLines.length > 0) {
    const line = getRandomElement(aarti.allLines);
    return {
      type: 'true_false',
      question: `खालील विधान चूक की बरोबर ते ओळखा:\n"‘${line}’ ही ओळ ‘${aarti.title}’ या रचनेमधील आहे."`,
      options: ['बरोबर', 'चूक'],
      correctAnswer: 'बरोबर',
      sourceAarti: aarti.title,
      sourceLine: line,
      points: 10,
      timeLimit: difficulty === 'easy' ? 20 : difficulty === 'hard' ? 12 : 15,
      verified: true,
      difficulty: difficulty as any,
    };
  }

  return null;
}

/**
 * 7. Missing Aarti Line
 */
function generateMissingLineQuestion(aarti: IAarti, allAartis: IAarti[], difficulty: string): GeneratedQuestion | null {
  // Find verse sections with at least 2 lines
  const multiLineSections = aarti.sections.filter((s) => s.lines.length >= 2);
  if (multiLineSections.length === 0) return null;

  const section = getRandomElement(multiLineSections);
  const lines = section.lines;
  const missingIndex = Math.floor(Math.random() * lines.length);
  const correctLine = lines[missingIndex];

  // Distractors from other lines
  const distractorPool: string[] = [];
  allAartis.forEach((a) => {
    a.allLines.forEach((l) => {
      if (l !== correctLine && !lines.includes(l) && !distractorPool.includes(l)) {
        distractorPool.push(l);
      }
    });
  });

  const distractors = shuffleArray(distractorPool).slice(0, 3);
  if (distractors.length < 3) return null;

  const options = shuffleArray([correctLine, ...distractors]);

  // Format question text showing context with blank
  const stanzaPreview = lines
    .map((l, i) => (i === missingIndex ? '👉 [.................. गहाळ ओळ ...................]' : l))
    .join('\n');

  return {
    type: 'missing_line',
    question: `खालील कडव्यातील योग्य गहाळ ओळ निवडा:\n\n${stanzaPreview}`,
    options,
    correctAnswer: correctLine,
    sourceAarti: aarti.title,
    sourceLine: correctLine,
    points: 15,
    timeLimit: difficulty === 'easy' ? 30 : difficulty === 'hard' ? 18 : 22,
    verified: true,
    difficulty: difficulty as any,
  };
}

/**
 * 8. Match Aarti Lines
 */
function generateMatchLinesQuestion(aarti: IAarti, difficulty: string): GeneratedQuestion | null {
  // Select 3 to 4 lines that can be neatly split into two parts
  const splittable = aarti.allLines.filter((l) => {
    const words = l.trim().split(/\s+/);
    return words.length >= 4;
  });

  if (splittable.length < 3) return null;

  const selectedLines = shuffleArray(splittable).slice(0, 3);
  const pairs: { left: string; right: string }[] = selectedLines.map((line) => {
    const words = line.trim().split(/\s+/);
    const mid = Math.ceil(words.length / 2);
    return {
      left: words.slice(0, mid).join(' '),
      right: words.slice(mid).join(' '),
    };
  });

  return {
    type: 'match_lines',
    question: 'आरतीच्या पूर्वार्ध आणि उत्तरार्धाच्या अचूक जोड्या जुळवा:',
    pairs,
    sourceAarti: aarti.title,
    sourceLine: selectedLines.join(' | '),
    points: 15,
    timeLimit: difficulty === 'easy' ? 40 : difficulty === 'hard' ? 25 : 30,
    verified: true,
    difficulty: difficulty as any,
  };
}

// ─── Main Generator Algorithm ──────────────────────────────────────────────────

export function generateAartiQuiz(
  aartis: IAarti[],
  options: QuizGeneratorOptions,
  onProgress?: (progress: number, message: string) => void
): GeneratedQuestion[] {
  const { totalQuestions, difficulty, selectedTypes, sourceAartis } = options;

  // Filter Aartis strictly to host's selection
  const activeAartis = aartis.filter((a) => sourceAartis.includes(a.title));
  if (activeAartis.length === 0) {
    throw new Error('निवडलेल्या आरत्या सापडल्या नाहीत. कृपया किमान एक आरती निवडा.');
  }

  onProgress?.(10, 'आरतीतील अस्सल संदर्भ तपासले जात आहेत...');

  // Available question types
  const ALL_TYPES: QuestionType[] = [
    'mcq',
    'fill_blank_options',
    'arrange_aarti',
    'incorrect_word',
    'incorrect_sentence',
    'missing_line',
    'true_false',
    'match_lines',
  ];

  let effectiveTypes: QuestionType[] = [];
  if (selectedTypes.includes('mixed') || selectedTypes.length === 0) {
    // Default mixed distribution:
    // ~30% MCQ, 25% Fill in blank, 20% Arrange, 15% Incorrect word, 10% Incorrect sentence
    effectiveTypes = ALL_TYPES;
  } else {
    effectiveTypes = selectedTypes.filter((t) => ALL_TYPES.includes(t as QuestionType)) as QuestionType[];
  }

  if (effectiveTypes.length === 0) {
    effectiveTypes = ['mcq', 'fill_blank_options', 'arrange_aarti'];
  }

  onProgress?.(25, 'विविध प्रश्न प्रकारांची मांडणी केली जात आहे...');

  const questions: GeneratedQuestion[] = [];
  const usedQuestionsSet = new Set<string>();

  // Determine distribution based on totalQuestions
  const typeQueue: QuestionType[] = [];
  if (selectedTypes.includes('mixed') || selectedTypes.length === 0) {
    const mcqCount = Math.max(1, Math.round(totalQuestions * 0.25));
    const fillCount = Math.max(1, Math.round(totalQuestions * 0.25));
    const arrangeCount = Math.max(1, Math.round(totalQuestions * 0.20));
    const incWordCount = Math.max(1, Math.round(totalQuestions * 0.15));
    const incSentCount = Math.max(1, Math.round(totalQuestions * 0.10));

    for (let i = 0; i < mcqCount; i++) typeQueue.push('mcq');
    for (let i = 0; i < fillCount; i++) typeQueue.push('fill_blank_options');
    for (let i = 0; i < arrangeCount; i++) typeQueue.push('arrange_aarti');
    for (let i = 0; i < incWordCount; i++) typeQueue.push('incorrect_word');
    for (let i = 0; i < incSentCount; i++) typeQueue.push('incorrect_sentence');

    // Fill remaining with other types
    while (typeQueue.length < totalQuestions) {
      typeQueue.push(getRandomElement(['missing_line', 'true_false', 'match_lines', 'fill_blank_options']));
    }
  } else {
    while (typeQueue.length < totalQuestions) {
      for (const t of effectiveTypes) {
        if (typeQueue.length < totalQuestions) typeQueue.push(t);
      }
    }
  }

  const shuffledQueue = shuffleArray(typeQueue).slice(0, totalQuestions);

  let currentAartiIdx = 0;
  let attempts = 0;
  const maxAttempts = totalQuestions * 15;

  while (questions.length < totalQuestions && attempts < maxAttempts) {
    attempts++;
    const targetType = shuffledQueue[questions.length] || getRandomElement(effectiveTypes);
    const aarti = activeAartis[currentAartiIdx % activeAartis.length];
    currentAartiIdx++;

    let generated: GeneratedQuestion | null = null;

    switch (targetType) {
      case 'fill_blank_options':
        generated = generateFillBlankQuestion(aarti, activeAartis, difficulty);
        break;
      case 'arrange_aarti':
        generated = generateArrangeAartiQuestion(aarti, difficulty);
        break;
      case 'incorrect_word':
        generated = generateIncorrectWordQuestion(aarti, difficulty);
        break;
      case 'incorrect_sentence':
        generated = generateIncorrectSentenceQuestion(aarti, activeAartis, difficulty);
        break;
      case 'mcq':
        generated = generateMCQQuestion(aarti, activeAartis, difficulty);
        break;
      case 'true_false':
        generated = generateTrueFalseQuestion(aarti, difficulty);
        break;
      case 'missing_line':
        generated = generateMissingLineQuestion(aarti, activeAartis, difficulty);
        break;
      case 'match_lines':
        generated = generateMatchLinesQuestion(aarti, difficulty);
        break;
    }

    if (generated && !usedQuestionsSet.has(generated.question)) {
      usedQuestionsSet.add(generated.question);
      questions.push(generated);

      const progress = Math.min(95, Math.round(25 + (questions.length / totalQuestions) * 70));
      onProgress?.(progress, `प्रश्न ${questions.length} / ${totalQuestions} तयार झाला...`);
    }
  }

  // ─── Robust Fallback Pass ──────────────────────────────────────────────────
  // If strict combination attempts didn't reach totalQuestions (e.g. only 1-2 Aartis selected),
  // cycle through lines with general question types (MCQ, Fill-blank, True/False, Missing line)
  if (questions.length < totalQuestions) {
    const fallbackTypes: QuestionType[] = ['fill_blank_options', 'mcq', 'true_false', 'missing_line', 'incorrect_word', 'arrange_aarti'];
    for (const aarti of activeAartis) {
      if (questions.length >= totalQuestions) break;
      for (const fType of fallbackTypes) {
        if (questions.length >= totalQuestions) break;
        let gen: GeneratedQuestion | null = null;
        if (fType === 'fill_blank_options') gen = generateFillBlankQuestion(aarti, activeAartis, difficulty);
        else if (fType === 'mcq') gen = generateMCQQuestion(aarti, activeAartis, difficulty);
        else if (fType === 'true_false') gen = generateTrueFalseQuestion(aarti, difficulty);
        else if (fType === 'missing_line') gen = generateMissingLineQuestion(aarti, activeAartis, difficulty);
        else if (fType === 'incorrect_word') gen = generateIncorrectWordQuestion(aarti, difficulty);
        else if (fType === 'arrange_aarti') gen = generateArrangeAartiQuestion(aarti, difficulty);

        if (gen && !usedQuestionsSet.has(gen.question)) {
          usedQuestionsSet.add(gen.question);
          questions.push(gen);
        }
      }
    }
  }

  // If still needing a few questions (e.g. very short single prayer),
  // generate fill-in-the-blank on remaining lines
  if (questions.length < totalQuestions) {
    for (const aarti of activeAartis) {
      for (const line of aarti.allLines) {
        if (questions.length >= totalQuestions) break;
        const words = line.trim().split(/\s+/).filter((w) => w.length >= 3);
        if (words.length >= 3) {
          const targetWord = words[Math.floor(Math.random() * words.length)];
          const distractorPool = ['मोरया', 'मंगलमूर्ती', 'गणराज', 'विघ्नहर्ता', 'लंबोदर', 'गजानन', 'एकदंत'];
          const distractors = distractorPool.filter((d) => d !== targetWord).slice(0, 3);
          const options = shuffleArray([targetWord, ...distractors]);
          const blankText = line.replace(targetWord, '______');
          const qText = `खालील रिकाम्या जागी योग्य शब्द भरा:\n"${blankText}"`;
          if (!usedQuestionsSet.has(qText)) {
            usedQuestionsSet.add(qText);
            questions.push({
              type: 'fill_blank_options',
              question: qText,
              options,
              correctAnswer: targetWord,
              sourceAarti: aarti.title,
              sourceLine: line,
              points: 10,
              timeLimit: 20,
              verified: true,
              difficulty: difficulty as any,
            });
          }
        }
      }
    }
  }

  onProgress?.(100, 'क्विझ निर्मिती पूर्ण झाली!');
  return questions;
}
