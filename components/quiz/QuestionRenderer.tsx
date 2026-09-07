/**
 * QuestionRenderer — renders a question by type (Duolingo-style):
 * mcq, true_false, fill_blank, multi_select, match, order and case (clinical).
 *
 * Owns its answer state and calls `onAnswered(correct)` exactly once on grading.
 * After answering it shows feedback (correct/incorrect), the explanation and,
 * when applicable, the correct answer.
 */

import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
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
    <View className="gap-2.5">
      {options.map((option, index) => {
        const isSelected = selectedIndexes.has(index);
        const isCorrectAnswer =
          phase !== 'idle' &&
          (correct === index || (correctIndexes?.includes(index) ?? false));
        const isWrongPick = phase === 'incorrect' && isSelected && !isCorrectAnswer;
        const isSelectedActive = phase === 'idle' && isSelected;

        let marker: 'check' | 'close' | 'none' = 'none';
        if (phase !== 'idle') {
          if (isCorrectAnswer) {
            marker = 'check';
          } else if (isWrongPick) {
            marker = 'close';
          }
        }

        return (
          <TouchableOpacity
            key={index}
            testID={`option-${index}`}
            className={`rounded-[14px] border-[1.5px] px-4 py-3.5 ${
              isSelectedActive
                ? 'border-clinical-dark bg-clinical-blue'
                : phase !== 'idle' && isCorrectAnswer
                  ? 'border-success-teal bg-success-tint'
                  : phase !== 'idle' && isWrongPick
                    ? 'border-error bg-error-tint'
                    : 'border-border-light bg-surface'
            }`}
            onPress={() => onSelect(index)}
            activeOpacity={phase !== 'idle' ? 1 : 0.7}
            accessibilityRole="button"
          >
            <View className="flex-row items-center">
              <View
                className={`mr-3 h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                  isSelectedActive ? 'border-white/50' : 'border-border-light'
                }`}
              >
                <Text
                  className={`font-inter-semibold text-[13px] ${
                    isSelectedActive ? 'text-white' : 'text-neutral'
                  }`}
                >
                  {String.fromCharCode(65 + index)}
                </Text>
              </View>
              <Text
                className={`flex-1 font-sans text-[15px] leading-[22px] ${
                  isSelectedActive ? 'text-white' : 'text-deep-slate'
                }`}
              >
                {option}
              </Text>
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
      <View className="mb-5 rounded-[16px] border border-border-light bg-surface p-4">
        <Text className="font-sans text-[16px] leading-[26px] text-deep-slate">
          {before}
          {selectedText ? (
            <Text
              testID="fill-blank-value"
              className={`font-inter-semibold ${
                phase === 'incorrect' && selected !== null && correctShuffledIndex !== selected
                  ? 'text-error'
                  : phase === 'correct'
                    ? 'text-success-teal'
                    : 'text-clinical-blue'
              }`}
            >
              {selectedText}
            </Text>
          ) : (
            <Text className="font-inter-semibold text-neutral">________</Text>
          )}
          {after}
        </Text>
      </View>

      <View className="mt-1 flex-row flex-wrap gap-2">
        {options.map((word, index) => {
          const isCorrectAnswer = phase !== 'idle' && index === correctShuffledIndex;
          const isWrongPick = phase === 'incorrect' && index === selected;
          const isSelectedActive = phase === 'idle' && index === selected;
          return (
            <TouchableOpacity
              key={index}
              testID={`fill-option-${index}`}
              className={`rounded-[16px] border-[1.5px] px-4 py-2.5 ${
                isSelectedActive
                  ? 'border-clinical-dark bg-clinical-blue'
                  : isCorrectAnswer
                    ? 'border-success-teal bg-success-tint'
                    : isWrongPick
                      ? 'border-error bg-error-tint'
                      : 'border-pill-border bg-surface'
              }`}
              onPress={() => onSelect(index)}
              activeOpacity={phase !== 'idle' ? 1 : 0.7}
            >
              <Text
                className={`font-inter-semibold text-[15px] ${
                  isSelectedActive ? 'text-white' : 'text-deep-slate'
                }`}
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
  // Keep a stable reference so the shuffle below runs once per question, not on
  // every render (display state changes: matches/activeLeft/phase).
  const pairs = useMemo(() => question.pairs ?? [], [question.pairs]);
  const rightOrder = useMemo(() => {
    return shuffle(pairs.map((_, i) => i));
  }, [pairs]);

  const isDone = matches.every((m) => m != null);

  return (
    <View>
      <View className="flex-row gap-3">
        <View className="flex-1 gap-2">
          {pairs.map((pair, leftIndex) => {
            const matched = matches[leftIndex];
            const isActive = activeLeft === leftIndex;
            const isGood = phase === 'correct' || (phase === 'incorrect' && matched === leftIndex);
            const isBad = phase === 'incorrect' && matched !== null && matched !== leftIndex;
            return (
              <TouchableOpacity
                key={leftIndex}
                testID={`match-left-${leftIndex}`}
                className={`min-h-[52px] justify-center rounded-[12px] border-[1.5px] px-3 py-3 ${
                  isGood
                    ? 'border-success-teal bg-success-tint'
                    : isBad
                      ? 'border-error bg-error-tint'
                      : isActive
                        ? 'border-clinical-dark bg-clinical-blue'
                        : 'border-border-light bg-sky-light'
                }`}
                onPress={() => (phase === 'idle' ? onPickLeft(leftIndex) : undefined)}
              >
                <Text
                  className={`font-inter-semibold text-[13px] leading-[18px] ${
                    isActive ? 'text-white' : 'text-deep-slate'
                  }`}
                >
                  {pair.left}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View className="flex-1 gap-2">
          {rightOrder.map((pairIndex, displayIndex) => {
            const leftIndex = matches.findIndex((m) => m === pairIndex);
            const isUsed = leftIndex !== -1;
            const isGood = phase === 'correct' || (phase === 'incorrect' && leftIndex === pairIndex);
            const isBad = phase === 'incorrect' && leftIndex !== -1 && leftIndex !== pairIndex;
            return (
              <TouchableOpacity
                key={displayIndex}
                testID={`match-right-${displayIndex}`}
                className={`min-h-[52px] justify-center rounded-[12px] border-[1.5px] px-3 py-3 ${
                  isGood
                    ? 'border-success-teal bg-success-tint'
                    : isBad
                      ? 'border-error bg-error-tint'
                      : 'border-pill-border bg-surface'
                }`}
                onPress={() => (phase === 'idle' ? onPickRight(pairIndex) : undefined)}
                disabled={isUsed}
              >
                <Text className="font-inter-semibold text-[13px] leading-[18px] text-deep-slate">
                  {pairs[pairIndex].right}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {!isDone && phase === 'idle' && (
        <Text className="mt-4 font-sans text-[13px] leading-[19px] text-neutral">
          Toca un término de la izquierda y luego su definición de la derecha.
        </Text>
      )}
      {isDone && phase === 'idle' && (
        <TouchableOpacity testID="quiz-confirm" className="mt-4 items-center justify-center rounded-[14px] bg-clinical-blue py-3.5" onPress={onConfirm}>
          <Text className="font-inter-semibold text-[16px] text-white">Confirmar</Text>
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
  // Stable reference: the shuffle should run once per question, not on every
  // render (placed/phase change as the user builds the sequence).
  const orderItems = useMemo(() => question.orderItems ?? [], [question.orderItems]);
  const shuffled = useMemo(() => {
    return shuffle(orderItems.map((_, i) => i));
  }, [orderItems]);

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
      <View className="mb-4 gap-2">
        {placed.length === 0 ? (
          <Text className="mt-4 font-sans text-[13px] leading-[19px] text-neutral">
            Toca los pasos en el orden correcto, del primero al último.
          </Text>
        ) : (
          placed.map((itemIndex, step) => {
            const ok = placedOk[step];
            return (
              <View
                key={`placed-${itemIndex}-${step}`}
                className={`flex-row items-center gap-3 rounded-[12px] border-[1.5px] px-3 py-2.5 ${
                  phase === 'idle'
                    ? 'border-clinical-dark bg-clinical-blue'
                    : ok
                      ? 'border-success-teal bg-success-tint'
                      : 'border-error bg-error-tint'
                }`}
              >
                <View
                  className={`h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    phase === 'idle'
                      ? 'bg-white'
                      : ok
                        ? 'bg-success-teal'
                        : 'bg-error'
                  }`}
                >
                  <Text
                    className={`font-inter-semibold text-[13px] ${
                      phase === 'idle' ? 'text-clinical-blue' : 'text-white'
                    }`}
                  >
                    {step + 1}
                  </Text>
                </View>
                <Text
                  className={`flex-1 font-sans text-[14px] leading-[20px] ${
                    phase === 'idle' ? 'text-white' : 'text-deep-slate'
                  }`}
                >
                  {orderItems[itemIndex].text}
                </Text>
              </View>
            );
          })
        )}
      </View>

      {available.length > 0 && phase === 'idle' && (
        <View className="mt-1 flex-row flex-wrap gap-2">
          {available.map((itemIndex) => (
            <TouchableOpacity
              key={`avail-${itemIndex}`}
              testID={`order-option-${itemIndex}`}
              className="rounded-[16px] border-[1.5px] border-pill-border bg-surface px-3.5 py-3"
              onPress={() => onTap(itemIndex)}
            >
              <Text className="font-inter-semibold text-[14px] leading-[19px] text-deep-slate">
                {orderItems[itemIndex].text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {isDone && phase === 'idle' && (
        <TouchableOpacity testID="quiz-confirm" className="mt-4 items-center justify-center rounded-[14px] bg-clinical-blue py-3.5" onPress={onConfirm}>
          <Text className="font-inter-semibold text-[16px] text-white">Confirmar orden</Text>
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
        <View className="mb-5 rounded-[16px] border border-border-light bg-sky-light p-4" testID="quiz-case">
          <View className="mb-2 flex-row items-center gap-2">
            <MaterialCommunityIcons name="stethoscope" size={16} color={Colors.clinicalBlue} />
            <Text className="font-heading-bold text-[14px] uppercase tracking-[0.5px] text-clinical-blue">
              Caso clínico
            </Text>
          </View>
          <Text className="font-sans text-[14px] leading-[21px] text-deep-slate">{question.caseText}</Text>
        </View>
      ) : null}

      <View className="mb-5 flex-row items-start gap-2">
        <Text testID="question-text" className="flex-1 font-heading-bold text-[20px] leading-[28px] text-deep-slate">
          {question.question}
        </Text>
        {question.hint ? (
          <TouchableOpacity
            testID="quiz-hint"
            className="mt-0.5 h-8 w-8 items-center justify-center rounded-full border border-pill-border bg-surface"
            onPress={() => setShowHint((s) => !s)}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="lightbulb-on-outline" size={16} color={Colors.clinicalBlue} />
          </TouchableOpacity>
        ) : null}
      </View>

      {showHint && question.hint ? (
        <View className="mb-4 rounded-[12px] bg-sky-light p-3" testID="quiz-hint-text">
          <Text className="font-sans text-[14px] leading-[20px] text-neutral">{question.hint}</Text>
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
            <Text className="mb-1 mt-3 font-sans text-[13px] text-neutral">
              Selecciona todas las opciones correctas.
            </Text>
          )}
          {multiDone && phase === 'idle' && (
            <TouchableOpacity testID="quiz-confirm" className="mt-4 items-center justify-center rounded-[14px] bg-clinical-blue py-3.5" onPress={confirmMultiSelect}>
              <Text className="font-inter-semibold text-[16px] text-white">Confirmar</Text>
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
          className={`mt-5 rounded-[14px] border p-4 ${
            phase === 'correct' ? 'border-success-teal bg-success-tint' : 'border-error bg-error-tint'
          }`}
        >
          <View className="mb-2 flex-row items-center gap-2">
            <MaterialCommunityIcons
              name={phase === 'correct' ? 'lightbulb-on' : 'information'}
              size={18}
              color={phase === 'correct' ? Colors.successTeal : '#C0392B'}
            />
            <Text
              className={`flex-1 font-heading-bold text-[14px] ${
                phase === 'correct' ? 'text-success-teal' : 'text-error'
              }`}
            >
              {phase === 'correct' ? '¡Correcto!' : 'Respuesta incorrecta'}
            </Text>
            <Text className="font-inter-semibold text-[12px] text-neutral">
              {index + 1}/{total}
            </Text>
          </View>
          <Text className="font-sans text-[14px] leading-[21px] text-deep-slate">
            {question.explanation || 'Sin explicación disponible.'}
          </Text>
        </View>
      )}
    </View>
  );
}
