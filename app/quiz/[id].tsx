import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProgress } from '@/src/hooks/useProgress';
import { getQuizQuestions, QUIZ_SPECIALTIES } from '@/src/data/quizData';
import type { Question } from '@/src/data/quizData';

type AnswerState = 'idle' | 'correct' | 'incorrect';

/** Parse quiz ID: "Operatoria Dental-2" → { specialty, level } */
function parseQuizId(id: string): { specialty: string; level: number } {
  const parts = id.split('-');
  const level = parseInt(parts[parts.length - 1], 10);
  const specialty = parts.slice(0, -1).join('-');

  if (!isNaN(level) && QUIZ_SPECIALTIES.includes(specialty)) {
    return { specialty, level };
  }

  // Legacy: "quiz-1" → Operatoria Dental level 1
  const legacyLevel = parseInt(parts[parts.length - 1], 10) || 1;
  return { specialty: 'Operatoria Dental', level: legacyLevel };
}

export default function QuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { completeLevel } = useProgress();

  const { specialty, level } = useMemo(() => parseQuizId(id ?? 'Operatoria Dental-1'), [id]);
  const questions: Question[] = useMemo(
    () => getQuizQuestions(specialty, level),
    [specialty, level]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>('idle');
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(1));

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const correctCount = answers.filter((a, i) => a === questions[i]?.correctIndex).length;

  const handleSelectOption = useCallback(
    (index: number) => {
      if (answerState !== 'idle') return; // Already answered

      setSelectedOption(index);
      const isCorrect = index === currentQuestion.correctIndex;
      setAnswerState(isCorrect ? 'correct' : 'incorrect');
    },
    [answerState, currentQuestion]
  );

  const handleNext = useCallback(() => {
    if (selectedOption === null) return;

    const newAnswers = [...answers, selectedOption];
    setAnswers(newAnswers);

    if (isLastQuestion) {
      const finalScore = newAnswers.filter((a, i) => a === questions[i]?.correctIndex).length;
      // Only complete the level when the student passes (≥70%); otherwise the
      // level stays active so the quiz can be retried.
      if (questions.length > 0 && finalScore / questions.length >= 0.7) {
        completeLevel(specialty, level);
      }
      setShowResult(true);
    } else {
      // Animate transition to next question
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIndex((prev) => prev + 1);
        setSelectedOption(null);
        setAnswerState('idle');
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [selectedOption, answers, isLastQuestion, currentIndex, completeLevel, specialty, level, questions, fadeAnim]);

  const handleFinish = useCallback(() => {
    router.replace('/(tabs)');
  }, [router]);

  const getOptionStyle = useCallback(
    (index: number) => {
      if (answerState === 'idle') {
        return {
          backgroundColor: selectedOption === index ? colors.clinicalBlue : colors.surface,
          borderColor: selectedOption === index ? '#005C8A' : colors.borderLight,
          borderBottomWidth: selectedOption === index ? 5 : 5,
        };
      }
      if (index === currentQuestion.correctIndex) {
        return { 
          backgroundColor: '#006B5F', 
          borderColor: '#004037', 
          borderBottomWidth: 5 
        };
      }
      if (index === selectedOption && answerState === 'incorrect') {
        return { 
          backgroundColor: '#C0392B', 
          borderColor: '#962D22', 
          borderBottomWidth: 5 
        };
      }
      return { 
        backgroundColor: colors.surface, 
        borderColor: colors.borderLight, 
        borderBottomWidth: 5 
      };
    },
    [answerState, selectedOption, currentQuestion, colors]
  );

  const getOptionTextColor = useCallback(
    (index: number) => {
      if (answerState === 'idle' && selectedOption === index) return '#FFFFFF';
      if (answerState !== 'idle') {
        if (index === currentQuestion.correctIndex) return '#FFFFFF';
        if (index === selectedOption) return '#FFFFFF';
      }
      return colors.deepSlate;
    },
    [answerState, selectedOption, currentQuestion, colors]
  );

  if (showResult) {
    const total = questions.length;
    const pct = Math.round((correctCount / total) * 100);
    const isPerfect = correctCount === total;
    const isGood = correctCount >= total * 0.7;
    const xpEarned = Math.round((correctCount / total) * 100);

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.skyLight }} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.resultContainer}
          showsVerticalScrollIndicator={false}
        >
          <View testID="quiz-result" style={{ width: '100%', alignItems: 'center' }}>
            {/* Emoji trophy */}
            <Text style={styles.resultEmoji}>
              {isPerfect ? '🏆' : isGood ? '⭐' : '📚'}
            </Text>

            {/* Score circle */}
            <View style={[styles.scoreCircle, {
              borderColor: isPerfect ? '#006B5F' : isGood ? colors.clinicalBlue : '#C0392B'
            }]}>
              <Text style={[styles.scorePercent, {
                color: isPerfect ? '#006B5F' : isGood ? colors.clinicalBlue : '#C0392B'
              }]}>
                {pct}%
              </Text>
              <Text style={[styles.scoreLabel, { color: colors.neutral }]}>
                {correctCount}/{total}
              </Text>
            </View>

            <Text style={[styles.resultTitle, { color: colors.deepSlate }]}>
              {isPerfect ? '¡Perfecto!' : isGood ? '¡Buen trabajo!' : 'Sigue practicando'}
            </Text>
            <Text style={[styles.resultSubtitle, { color: colors.neutral }]}>
              {specialty} — Nivel {level}
            </Text>
            <Text style={[styles.resultMessage, { color: colors.neutral }]}>
              {isPerfect
                ? 'Dominas completamente este tema. ¡Excelente!'
                : isGood
                ? 'Muy buena comprensión del tema. Repasa los conceptos fallados.'
                : 'Revisa el material antes de continuar. ¡Puedes mejorar!'}
            </Text>

            {/* XP earned badge */}
            <View style={[styles.xpBadge, { backgroundColor: colors.clinicalBlue + '15', marginBottom: 24 }]}>
              <MaterialCommunityIcons name="star-four-points" size={16} color={colors.clinicalBlue} />
              <Text style={[styles.xpText, { color: colors.clinicalBlue }]}>
                +{xpEarned} XP ganados
              </Text>
            </View>

            {/* Buttons (3D style) */}
            <TouchableOpacity
              style={[
                styles.finishButton,
                {
                  backgroundColor: colors.clinicalBlue,
                  borderColor: '#005C8A',
                  borderWidth: 1,
                  borderBottomWidth: 5,
                },
              ]}
              onPress={handleFinish}
            >
              <MaterialCommunityIcons name="home" size={18} color="#FFFFFF" />
              <Text style={styles.finishButtonText}>Volver al inicio</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.retryButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderLight,
                  borderWidth: 2,
                  borderBottomWidth: 5,
                },
              ]}
              onPress={() => {
                setCurrentIndex(0);
                setSelectedOption(null);
                setAnswerState('idle');
                setAnswers([]);
                setShowResult(false);
              }}
            >
              <MaterialCommunityIcons name="refresh" size={18} color={colors.clinicalBlue} />
              <Text style={[styles.retryButtonText, { color: colors.clinicalBlue }]}>
                Repetir quiz
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Empty state guard (specialty not found in question bank) ────────────────
  if (questions.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.skyLight }} edges={['top', 'bottom']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🚧</Text>
          <Text style={[{ fontFamily: 'Manrope-Bold', fontSize: 22, textAlign: 'center', marginBottom: 8 }, { color: colors.deepSlate }]}>
            Preguntas en preparación
          </Text>
          <Text style={[{ fontFamily: 'Inter', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 }, { color: colors.neutral }]}>
            Las preguntas para {specialty} estarán disponibles pronto.
          </Text>
          <TouchableOpacity
            style={[{ borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 }, { backgroundColor: colors.clinicalBlue }]}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#FFFFFF' }}>Volver al inicio</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Quiz screen ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.skyLight }} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="close" size={22} color={colors.neutral} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerSpecialty, { color: colors.clinicalBlue }]} numberOfLines={1}>
            {specialty}
          </Text>
          <Text style={[styles.headerLevel, { color: colors.neutral }]}>Nivel {level}</Text>
        </View>
        <Text style={[styles.headerCounter, { color: colors.neutral }]}>
          {currentIndex + 1}/{questions.length}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressBar, { backgroundColor: colors.borderLight }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${((currentIndex + (answerState !== 'idle' ? 1 : 0)) / questions.length) * 100}%`,
              backgroundColor: colors.clinicalBlue,
            },
          ]}
        />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Question */}
          <Text
            testID="question-text"
            style={[styles.question, { color: colors.deepSlate }]}
          >
            {currentQuestion.question}
          </Text>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                testID={`option-${index}`}
                style={[styles.option, { borderWidth: 1.5 }, getOptionStyle(index)]}
                onPress={() => handleSelectOption(index)}
                activeOpacity={answerState !== 'idle' ? 1 : 0.7}
              >
                <View style={styles.optionContent}>
                  <View style={[styles.optionBullet, { borderColor: getOptionTextColor(index) === '#FFFFFF' ? 'rgba(255,255,255,0.5)' : colors.borderLight }]}>
                    <Text style={[styles.optionBulletText, { color: getOptionTextColor(index) }]}>
                      {String.fromCharCode(65 + index)}
                    </Text>
                  </View>
                  <Text style={[styles.optionText, { color: getOptionTextColor(index) }]}>
                    {option}
                  </Text>
                  {answerState !== 'idle' && index === currentQuestion.correctIndex && (
                    <MaterialCommunityIcons name="check-circle" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  )}
                  {answerState === 'incorrect' && index === selectedOption && (
                    <MaterialCommunityIcons name="close-circle" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Explanation (shown after answering) */}
          {answerState !== 'idle' && (
            <View style={[styles.explanation, { backgroundColor: answerState === 'correct' ? '#E8F5F3' : '#FDE8E7', borderColor: answerState === 'correct' ? '#006B5F' : '#C0392B' }]}>
              <View style={styles.explanationHeader}>
                <MaterialCommunityIcons
                  name={answerState === 'correct' ? 'lightbulb-on' : 'information'}
                  size={18}
                  color={answerState === 'correct' ? '#006B5F' : '#C0392B'}
                />
                <Text style={[styles.explanationTitle, { color: answerState === 'correct' ? '#006B5F' : '#C0392B' }]}>
                  {answerState === 'correct' ? '¡Correcto!' : 'Respuesta incorrecta'}
                </Text>
              </View>
              <Text style={[styles.explanationText, { color: colors.deepSlate }]}>
                {currentQuestion.explanation}
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.borderLight }]}>
        <TouchableOpacity
          testID="next-question"
          style={[
            styles.nextButton,
            {
              backgroundColor: answerState !== 'idle' ? colors.clinicalBlue : colors.borderLight,
              borderColor: answerState !== 'idle' ? '#005C8A' : colors.borderLight,
              borderWidth: 1,
              borderBottomWidth: answerState !== 'idle' ? 5 : 1,
            },
          ]}
          onPress={answerState !== 'idle' ? handleNext : undefined}
          disabled={answerState === 'idle'}
          activeOpacity={0.8}
        >
          <Text style={[styles.nextButtonText, { color: answerState !== 'idle' ? '#FFFFFF' : colors.neutral }]}>
            {answerState === 'idle'
              ? 'Selecciona una respuesta'
              : isLastQuestion
              ? 'Ver resultado'
              : 'Siguiente pregunta'}
          </Text>
          {answerState !== 'idle' && (
            <MaterialCommunityIcons
              name={isLastQuestion ? 'flag-checkered' : 'arrow-right'}
              size={20}
              color="#FFFFFF"
            />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerSpecialty: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
  },
  headerLevel: {
    fontFamily: 'Inter',
    fontSize: 12,
  },
  headerCounter: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    minWidth: 36,
    textAlign: 'right',
  },
  progressBar: {
    height: 3,
    width: '100%',
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
    minWidth: 4,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  question: {
    fontFamily: 'Manrope-Bold',
    fontSize: 20,
    lineHeight: 28,
    marginBottom: 24,
  },
  optionsContainer: {
    gap: 10,
  },
  option: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
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
  explanation: {
    marginTop: 20,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  explanationTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
  },
  explanationText: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 21,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  nextButton: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  // Result screen
  resultContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 48,
    paddingBottom: 40,
    gap: 16,
  },
  resultEmoji: {
    fontSize: 56,
    marginBottom: 8,
  },
  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  scorePercent: {
    fontFamily: 'Manrope-Bold',
    fontSize: 36,
  },
  scoreLabel: {
    fontFamily: 'Inter',
    fontSize: 14,
  },
  resultTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 28,
    textAlign: 'center',
  },
  resultSubtitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    textAlign: 'center',
  },
  resultMessage: {
    fontFamily: 'Inter',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  xpText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  finishButton: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
  },
  finishButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  retryButton: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
  },
  retryButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
  },
});

