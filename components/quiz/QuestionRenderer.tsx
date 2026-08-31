/**
 * QuestionRenderer — renders a question by type (Duolingo-style):
 * mcq, true_false, fill_blank, multi_select, match, order and case (clinical).
 *
 * Owns its answer state and calls `onAnswered(correct)` exactly once on grading.
 * After answering it shows feedback (correct/incorrect), the explanation and,
 * when applicable, the correct answer.
 */

import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import type { QuizQuestion } from '@/src/services/quiz';

export type AnswerPhase = 'idle' | 'correct' | 'incorrect';

interface QuestionRendererProps {
  question: QuizQuestion;
  /** Called exactly once when the question is graded. */
  onAnswered: (correct: boolean) => void;
  index: number;
  total: number;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function setsEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sb = new Set(b);
  return a.every((x) => sb.has(x));
}

function MultiOptionList({
  options,
  correct,
  correctIndexes,
  phase,
  selectedIndexes,
  onSelect,
}: {
  options: string[];
  correct?: number | null;
  correctIndexes?: number[] | null;
  phase: AnswerPhase;
  selectedIndexes: Set<number>;
  onSelect: (index: number) => void;
}) {
  return (
    <View style={styles.options}>
      {options.map((option, index) => {
        const isSelected = selectedIndexes.has(index);
        const isCorrectAnswer =
          phase !== 'idle' &&
          (correct === index || (correctIndexes?.includes(index) ?? false));
        const isWrongPick = phase === 'incorrect' && isSelected && !isCorrectAnswer;

        let bg = Colors.surface;
        let border = Colors.borderLight;
        let textColor = Colors.deepSlate;
        let marker: 'check' | 'close' | 'none' = 'none';

        if (phase === 'idle') {
          if (isSelected) {
            bg = Colors.clinicalBlue;
            border = '#005C8A';
            textColor = '#FFFFFF';
          }
        } else {
          if (isCorrectAnswer) {
            bg = '#E8F5F3';
            border = Colors.successTeal;
            textColor = Colors.deepSlate;
            marker = 'check';
          } else if (isWrongPick) {
            bg = '#FDE8E7';
            border = '#C0392B';
            textColor = Colors.deepSlate;
            marker = 'close';
          }
        }

        return (
          <TouchableOpacity
            key={index}
            testID={`option-${index}`}
            style={[styles.option, { backgroundColor: bg, borderColor: border }]}
            onPress={() => onSelect(index)}
            activeOpacity={phase !== 'idle' ? 1 : 0.7}
            accessibilityRole="button"
          >
            <View style={styles.optionContent}>
              <View
                style={[
                  styles.optionBullet,
                  { borderColor: phase === 'idle' && isSelected ? 'rgba(255,255,255,0.5)' : Colors.borderLight },
                ]}
              >
                <Text
                  style={[
                    styles.optionBulletText,
                    { color: phase === 'idle' && isSelected ? '#FFFFFF' : Colors.neutral },
                  ]}
                >
                  {String.fromCharCode(65 + index)}
                </Text>
              </View>
              <Text style={[styles.optionText, { color: textColor }]}>{option}</Text>
              {marker !== 'none' && (
                <MaterialCommunityIcons
                  name={marker === 'check' ? 'check-circle' : 'close-circle'}
                  size={20}
                  color={marker === 'check' ? Colors.successTeal : '#C0392B'}
                  style={{ marginLeft: 8 }}
                />
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function FillBlank({
  question,
  options,
  correctShuffledIndex,
  phase,
  selected,
  onSelect,
}: {
  question: QuizQuestion;
  options: string[];
  /** Position of the correct tile AFTER the options are shuffled. */
  correctShuffledIndex: number;
  phase: AnswerPhase;
  selected: number | null;
  onSelect: (index: number) => void;
}) {
  const [before, after] = useMemo(() => {
    const parts = question.question.split('____');
    return [parts[0] ?? '', parts.slice(1).join('____')];
  }, [question.question]);

  const selectedText = selected !== null ? options[selected] : null;

  return (
    <View>
      <View style={styles.fillSentence}>
        <Text style={styles.fillText}>
          {before}
          {selectedText ? (
            <Text
              testID="fill-blank-value"
              style={[
                styles.fillBlank,
                phase === 'incorrect' && selected !== null && correctShuffledIndex !== selected && styles.fillBlankWrong,
                phase === 'correct' && styles.fillBlankCorrect,
              ]}
            >
              {selectedText}
            </Text>
          ) : (
            <Text style={[styles.fillBlank, styles.fillBlankEmpty]}>________</Text>
          )}
          {after}
        </Text>
      </View>

      <View style={styles.fillTiles}>
        {options.map((word, index) => {
          const isCorrectAnswer = phase !== 'idle' && index === correctShuffledIndex;
          const isWrongPick = phase === 'incorrect' && index === selected;
          let bg = Colors.surface;
          let border = Colors.pillBorder;
          if (phase === 'idle' && index === selected) {
            bg = Colors.clinicalBlue;
            border = '#005C8A';
          } else if (isCorrectAnswer) {
            bg = '#E8F5F3';
            border = Colors.successTeal;
          } else if (isWrongPick) {
            bg = '#FDE8E7';
            border = '#C0392B';
          }
          return (
            <TouchableOpacity
              key={index}
              testID={`fill-option-${index}`}
              style={[styles.fillTile, { backgroundColor: bg, borderColor: border }]}
              onPress={() => onSelect(index)}
              activeOpacity={phase !== 'idle' ? 1 : 0.7}
            >
              <Text
                style={[
                  styles.fillTileText,
                  { color: phase === 'idle' && index === selected ? '#FFFFFF' : Colors.deepSlate },
                ]}
              >
                {word}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function MatchQuestion({
  question,
  phase,
  matches,
  activeLeft,
  onPickLeft,
  onPickRight,
  onConfirm,
}: {
  question: QuizQuestion;
  phase: AnswerPhase;
  matches: (number | null)[];
  activeLeft: number | null;
  onPickLeft: (index: number) => void;
  onPickRight: (rightIndex: number) => void;
  onConfirm: () => void;
}) {
  const pairs = question.pairs ?? [];
  const rightOrder = useMemo(() => {
    return shuffle(pairs.map((_, i) => i));
  }, [question.id]);

  const isDone = matches.every((m) => m != null);

  return (
    <View>
      <View style={styles.matchGrid}>
        <View style={styles.matchColumn}>
          {pairs.map((pair, leftIndex) => {
            const matched = matches[leftIndex];
            const isActive = activeLeft === leftIndex;
            const isGood = phase === 'correct' || (phase === 'incorrect' && matched === leftIndex);
            const isBad = phase === 'incorrect' && matched !== null && matched !== leftIndex;
            return (
              <TouchableOpacity
                key={leftIndex}
                testID={`match-left-${leftIndex}`}
                style={[
                  styles.matchCard,
                  {
                    backgroundColor: isGood ? '#E8F5F3' : isBad ? '#FDE8E7' : isActive ? Colors.clinicalBlue : Colors.skyLight,
                    borderColor: isGood ? Colors.successTeal : isBad ? '#C0392B' : isActive ? '#005C8A' : Colors.borderLight,
                  },
                ]}
                onPress={() => (phase === 'idle' ? onPickLeft(leftIndex) : undefined)}
              >
                <Text
                  style={[
                    styles.matchCardText,
                    { color: isActive ? '#FFFFFF' : Colors.deepSlate },
                  ]}
                >
                  {pair.left}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.matchColumn}>
          {rightOrder.map((pairIndex, displayIndex) => {
            const leftIndex = matches.findIndex((m) => m === pairIndex);
            const isUsed = leftIndex !== -1;
            const isGood = phase === 'correct' || (phase === 'incorrect' && leftIndex === pairIndex);
            const isBad = phase === 'incorrect' && leftIndex !== -1 && leftIndex !== pairIndex;
            return (
              <TouchableOpacity
                key={displayIndex}
                testID={`match-right-${displayIndex}`}
                style={[
                  styles.matchCard,
                  {
                    backgroundColor: isGood ? '#E8F5F3' : isBad ? '#FDE8E7' : Colors.surface,
                    borderColor: isGood ? Colors.successTeal : isBad ? '#C0392B' : Colors.pillBorder,
                  },
                ]}
                onPress={() => (phase === 'idle' ? onPickRight(pairIndex) : undefined)}
                disabled={isUsed}
              >
                <Text style={styles.matchCardText}>{pairs[pairIndex].right}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {!isDone && phase === 'idle' && (
        <Text style={styles.matchHintText}>
          Toca un término de la izquierda y luego su definición de la derecha.
        </Text>
      )}
      {isDone && phase === 'idle' && (
        <TouchableOpacity testID="quiz-confirm" style={styles.confirmButton} onPress={onConfirm}>
          <Text style={styles.confirmText}>Confirmar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function OrderQuestion({
  question,
  phase,
  placed,
  onTap,
  onConfirm,
}: {
  question: QuizQuestion;
  phase: AnswerPhase;
  placed: number[];
  onTap: (index: number) => void;
  onConfirm: () => void;
}) {
  const orderItems = question.orderItems ?? [];
  const shuffled = useMemo(() => {
    return shuffle(orderItems.map((_, i) => i));
  }, [question.id]);

  const available = shuffled.filter((i) => !placed.includes(i));
  const isDone = placed.length === orderItems.length;

  const placedOk = useMemo(() => {
    if (phase === 'idle') return placed.map(() => true);
    return placed.map((itemIndex, step) => {
      const expected = orderItems[itemIndex].position;
      const wanted = step + 1;
      return expected === wanted;
    });
  }, [phase, placed, orderItems]);

  return (
    <View>
      <View style={styles.orderList}>
        {placed.length === 0 ? (
          <Text style={styles.matchHintText}>
            Toca los pasos en el orden correcto, del primero al último.
          </Text>
        ) : (
          placed.map((itemIndex, step) => {
            const ok = placedOk[step];
            return (
              <View
                key={`placed-${itemIndex}-${step}`}
                style={[
                  styles.orderPlaced,
                  {
                    backgroundColor: phase === 'idle' ? Colors.clinicalBlue : ok ? '#E8F5F3' : '#FDE8E7',
                    borderColor: phase === 'idle' ? '#005C8A' : ok ? Colors.successTeal : '#C0392B',
                  },
                ]}
              >
                <View
                  style={[
                    styles.orderStep,
                    { backgroundColor: phase === 'idle' ? '#FFFFFF' : ok ? Colors.successTeal : '#C0392B' },
                  ]}
                >
                  <Text
                    style={[
                      styles.orderStepText,
                      { color: phase === 'idle' ? Colors.clinicalBlue : '#FFFFFF' },
                    ]}
                  >
                    {step + 1}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.orderPlacedText,
                    { color: phase === 'idle' ? '#FFFFFF' : Colors.deepSlate },
                  ]}
                >
                  {orderItems[itemIndex].text}
                </Text>
              </View>
            );
          })
        )}
      </View>

      {available.length > 0 && phase === 'idle' && (
        <View style={styles.fillTiles}>
          {available.map((itemIndex) => (
            <TouchableOpacity
              key={`avail-${itemIndex}`}
              testID={`order-option-${itemIndex}`}
              style={styles.orderChip}
              onPress={() => onTap(itemIndex)}
            >
              <Text style={styles.orderChipText}>{orderItems[itemIndex].text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {isDone && phase === 'idle' && (
        <TouchableOpacity testID="quiz-confirm" style={styles.confirmButton} onPress={onConfirm}>
          <Text style={styles.confirmText}>Confirmar orden</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function QuestionRenderer({
  question,
  onAnswered,
  index,
  total,
}: QuestionRendererProps) {
  const [phase, setPhase] = useState<AnswerPhase>('idle');
  const [selected, setSelected] = useState<number | null>(null); // mcq / true_false / fill_blank
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set()); // multi_select
  const [matches, setMatches] = useState<(number | null)[]>(
    () => (question.pairs ?? []).map(() => null)
  );
  const [activeLeft, setActiveLeft] = useState<number | null>(null);
  const [placed, setPlaced] = useState<number[]>([]);
  const [showHint, setShowHint] = useState(false);

  const reveal = (correct: boolean) => {
    setPhase(correct ? 'correct' : 'incorrect');
    onAnswered(correct);
  };

  const isCase = question.type === 'case';
  const type = isCase ? 'mcq' : question.type;

  const confirmMultiSelect = () => {
    if (selectedIndexes.size === 0) return;
    const correct =
      setsEqual(
        [...selectedIndexes].sort((a, b) => a - b),
        [...(question.correctIndexes ?? [])].sort((a, b) => a - b)
      );
    reveal(correct);
  };

  const pickLeft = (leftIndex: number) => {
    if (matches[leftIndex] != null) return;
    setActiveLeft((prev) => (prev === leftIndex ? null : leftIndex));
  };

  const pickRight = (rightIndex: number) => {
    if (activeLeft === null) return;
    const next = [...matches];
    next[activeLeft] = rightIndex;
    setMatches(next);
    setActiveLeft(null);
  };

  const confirmMatch = () => {
    const correct = matches.every((m, li) => m === li);
    reveal(correct);
  };

  const tapOrder = (itemIndex: number) => {
    if (placed.includes(itemIndex)) return;
    setPlaced((prev) => [...prev, itemIndex]);
  };

  const confirmOrder = () => {
    const correct = placed.every((itemIndex, step) => question.orderItems?.[itemIndex].position === step + 1);
    reveal(correct);
  };

  const options = question.options ?? [];
  const multiDone = type === 'multi_select' && selectedIndexes.size > 0;

  // fill_blank tiles are shuffled; remap the correct answer to its shuffled
  // position so grading and highlighting use consistent indices.
  const fillBlank = useMemo(() => {
    if (type !== 'fill_blank') return null;
    const opts = question.options ?? [];
    const indexes = shuffle(opts.map((_, i) => i));
    return {
      options: indexes.map((i) => opts[i]),
      correctShuffledIndex: question.correctIndex != null ? indexes.indexOf(question.correctIndex) : -1,
    };
  }, [question, type]);

  return (
    <View testID="question-renderer">
      {/* Clinical case header */}
      {isCase && question.caseText ? (
        <View style={styles.caseBox} testID="quiz-case">
          <View style={styles.caseHeader}>
            <MaterialCommunityIcons name="stethoscope" size={16} color={Colors.clinicalBlue} />
            <Text style={styles.caseTitle}>Caso clínico</Text>
          </View>
          <Text style={styles.caseText}>{question.caseText}</Text>
        </View>
      ) : null}

      <View style={styles.questionRow}>
        <Text testID="question-text" style={styles.question}>
          {question.question}
        </Text>
        {question.hint ? (
          <TouchableOpacity
            testID="quiz-hint"
            style={styles.hintButton}
            onPress={() => setShowHint((s) => !s)}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="lightbulb-on-outline" size={16} color={Colors.clinicalBlue} />
          </TouchableOpacity>
        ) : null}
      </View>

      {showHint && question.hint ? (
        <View style={styles.hintBox} testID="quiz-hint-text">
          <Text style={styles.hintText}>{question.hint}</Text>
        </View>
      ) : null}

      {type === 'mcq' && (
        <MultiOptionList
          options={options}
          correct={question.correctIndex}
          phase={phase}
          selectedIndexes={selected !== null ? new Set([selected]) : new Set()}
          onSelect={(i) => {
            if (phase !== 'idle') return;
            setSelected(i);
            reveal(i === question.correctIndex);
          }}
        />
      )}

      {type === 'true_false' && (
        <MultiOptionList
          options={options.length > 0 ? options : ['Verdadero', 'Falso']}
          correct={question.correctIndex}
          phase={phase}
          selectedIndexes={selected !== null ? new Set([selected]) : new Set()}
          onSelect={(i) => {
            if (phase !== 'idle') return;
            setSelected(i);
            reveal(i === question.correctIndex);
          }}
        />
      )}

      {type === 'fill_blank' && fillBlank && (
        <FillBlank
          question={question}
          options={fillBlank.options}
          correctShuffledIndex={fillBlank.correctShuffledIndex}
          phase={phase}
          selected={selected}
          onSelect={(i) => {
            if (phase !== 'idle') return;
            setSelected(i);
            reveal(i === fillBlank.correctShuffledIndex);
          }}
        />
      )}

      {type === 'multi_select' && (
        <>
          <MultiOptionList
            options={options}
            correctIndexes={question.correctIndexes}
            phase={phase}
            selectedIndexes={selectedIndexes}
            onSelect={(i) => {
              if (phase !== 'idle') return;
              setSelectedIndexes((prev) => {
                const next = new Set(prev);
                if (next.has(i)) next.delete(i);
                else next.add(i);
                return next;
              });
            }}
          />
          {phase === 'idle' && (
            <Text style={styles.multiHint}>Selecciona todas las opciones correctas.</Text>
          )}
          {multiDone && phase === 'idle' && (
            <TouchableOpacity testID="quiz-confirm" style={styles.confirmButton} onPress={confirmMultiSelect}>
              <Text style={styles.confirmText}>Confirmar</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {type === 'match' && (
        <MatchQuestion
          question={question}
          phase={phase}
          matches={matches}
          activeLeft={activeLeft}
          onPickLeft={pickLeft}
          onPickRight={pickRight}
          onConfirm={confirmMatch}
        />
      )}

      {type === 'order' && (
        <OrderQuestion
          question={question}
          phase={phase}
          placed={placed}
          onTap={tapOrder}
          onConfirm={confirmOrder}
        />
      )}

      {/* Feedback */}
      {phase !== 'idle' && (
        <View
          testID="quiz-feedback"
          style={[
            styles.feedback,
            { backgroundColor: phase === 'correct' ? '#E8F5F3' : '#FDE8E7', borderColor: phase === 'correct' ? Colors.successTeal : '#C0392B' },
          ]}
        >
          <View style={styles.feedbackHeader}>
            <MaterialCommunityIcons
              name={phase === 'correct' ? 'lightbulb-on' : 'information'}
              size={18}
              color={phase === 'correct' ? Colors.successTeal : '#C0392B'}
            />
            <Text
              style={[
                styles.feedbackTitle,
                { color: phase === 'correct' ? Colors.successTeal : '#C0392B' },
              ]}
            >
              {phase === 'correct' ? '¡Correcto!' : 'Respuesta incorrecta'}
            </Text>
            <Text style={styles.feedbackProgress}>
              {index + 1}/{total}
            </Text>
          </View>
          <Text style={styles.feedbackText}>{question.explanation || 'Sin explicación disponible.'}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: 10,
  },
  option: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionBullet: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  optionBulletText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
  },
  optionText: {
    fontFamily: 'Inter',
    fontSize: 15,
    flex: 1,
    lineHeight: 22,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 20,
  },
  question: {
    fontFamily: 'Manrope-Bold',
    fontSize: 20,
    lineHeight: 28,
    color: Colors.deepSlate,
    flex: 1,
  },
  hintButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.pillBorder,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  hintBox: {
    backgroundColor: Colors.skyLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  hintText: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: Colors.neutral,
    lineHeight: 20,
  },
  caseBox: {
    backgroundColor: Colors.skyLight,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  caseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  caseTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: Colors.clinicalBlue,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  caseText: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 21,
    color: Colors.deepSlate,
  },
  fillSentence: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surface,
    padding: 16,
    marginBottom: 20,
  },
  fillText: {
    fontFamily: 'Inter',
    fontSize: 16,
    lineHeight: 26,
    color: Colors.deepSlate,
  },
  fillBlank: {
    fontFamily: 'Inter-SemiBold',
    color: Colors.clinicalBlue,
  },
  fillBlankEmpty: {
    color: Colors.neutral,
  },
  fillBlankCorrect: {
    color: Colors.successTeal,
  },
  fillBlankWrong: {
    color: '#C0392B',
  },
  fillTiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  fillTile: {
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  fillTileText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
  },
  multiHint: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: Colors.neutral,
    marginTop: 12,
    marginBottom: 4,
  },
  confirmButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.clinicalBlue,
    marginTop: 16,
  },
  confirmText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  matchGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  matchColumn: {
    flex: 1,
    gap: 8,
  },
  matchCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 52,
    justifyContent: 'center',
  },
  matchCardText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    lineHeight: 18,
    color: Colors.deepSlate,
  },
  matchHintText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: Colors.neutral,
    marginTop: 16,
    lineHeight: 19,
  },
  orderList: {
    gap: 8,
    marginBottom: 16,
  },
  orderPlaced: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  orderStep: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  orderStepText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
  },
  orderPlacedText: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  orderChip: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.pillBorder,
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  orderChipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.deepSlate,
    lineHeight: 19,
  },
  feedback: {
    marginTop: 20,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  feedbackTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    flex: 1,
  },
  feedbackProgress: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: Colors.neutral,
  },
  feedbackText: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 21,
    color: Colors.deepSlate,
  },
});
