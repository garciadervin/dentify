import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenContainer from '@/components/ScreenContainer';
import AppHeader from '@/components/AppHeader';
import QuestionRenderer from '@/components/quiz/QuestionRenderer';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';
import { useProgress } from '@/src/hooks/useProgress';
import { useBadges } from '@/src/hooks/useBadges';
import { fetchQuizSession, recordAnswer, type QuizQuestion } from '@/src/services/quiz';
import { recordStudyActivity } from '@/src/services/activity';

/** XP multiplier based on the combo reached before answering. */
function comboMultiplier(comboBefore: number): number {
  if (comboBefore >= 6) return 2.5;
  if (comboBefore >= 4) return 2;
  if (comboBefore >= 2) return 1.5;
  return 1;
}

/** Parse quiz ID: "Operatoria Dental-2" → { specialty, level } */
function parseQuizId(id: string): { specialty: string; level: number } {
  const parts = id.split('-');
  const level = parseInt(parts[parts.length - 1], 10);
  const specialty = parts.slice(0, -1).join('-');
  return {
    specialty: specialty || 'Operatoria Dental',
    level: isNaN(level) ? 1 : level,
  };
}

interface AnswerResult {
  correct: boolean;
  earned: number;
}

export default function QuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { completeLevel, completedQuizCount } = useProgress();
  const { checkAndAwardBadge } = useBadges();

  const { specialty, level } = parseQuizId(id ?? 'Operatoria Dental-1');

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReview, setIsReview] = useState(false);
  const [sessionNonce, setSessionNonce] = useState(0);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [currentCorrect, setCurrentCorrect] = useState(false);
  const [results, setResults] = useState<AnswerResult[]>([]);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [levelCompleted, setLevelCompleted] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(1));
  const transitioningRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const qs = await fetchQuizSession(specialty, level, 10);
      if (cancelled) return;
      setQuestions(qs);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialty, level, sessionNonce]);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const correctCount = results.filter((r) => r.correct).length;
  const wrongQuestions = useMemo(
    () =>
      results.length === questions.length && questions.length > 0
        ? questions.filter((q, i) => !results[i]?.correct)
        : [],
    [results, questions]
  );

  const handleAnswered = useCallback(
    (correct: boolean) => {
      if (answered || !currentQuestion) return;
      setAnswered(true);
      setCurrentCorrect(correct);

      const multiplier = comboMultiplier(combo);
      const earned = correct ? Math.round(currentQuestion.points * multiplier) : 0;

      setResults((prev) => [...prev, { correct, earned }]);
      setTotalXp((prev) => prev + earned);
      const newCombo = correct ? combo + 1 : 0;
      setCombo(newCombo);
      if (newCombo > maxCombo) setMaxCombo(newCombo);

      if (user) void recordAnswer(currentQuestion.id, correct);
    },
    [answered, combo, currentQuestion, maxCombo, user]
  );

  const handleNext = useCallback(() => {
    if (!answered || transitioningRef.current) return;
    if (isLastQuestion) {
      setShowResult(true);
      const correct = correctCount;
      const total = questions.length;
      const passed = total > 0 && correct / total >= 0.7;
      if (passed && !isReview) {
        completeLevel(specialty, level).then((ok) => {
          if (ok) setLevelCompleted(true);
        });
        if (user) {
          void recordStudyActivity(user.id).then((s) => {
            if (s >= 3) void checkAndAwardBadge('streak', s);
          });
        }
        void checkAndAwardBadge('quiz_complete', completedQuizCount + 1);
        void checkAndAwardBadge('level_up', level);
      }
      return;
    }
    transitioningRef.current = true;
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start(() => {
      setCurrentIndex((prev) => prev + 1);
      setAnswered(false);
      setCurrentCorrect(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start(() => {
        transitioningRef.current = false;
      });
    });
  }, [
    answered,
    isLastQuestion,
    correctCount,
    questions.length,
    isReview,
    specialty,
    level,
    completeLevel,
    user,
    checkAndAwardBadge,
    completedQuizCount,
    fadeAnim,
  ]);

  const handleStartReview = useCallback(() => {
    const wrongIds = new Set(wrongQuestions.map((q) => q.id));
    setQuestions(wrongQuestions);
    setIsReview(true);
    setResults([]);
    setCombo(0);
    setMaxCombo(0);
    setTotalXp(0);
    setCurrentIndex(0);
    setAnswered(false);
    setCurrentCorrect(false);
    setShowResult(false);
  }, [wrongQuestions]);

  const handleRestart = useCallback(() => {
    setSessionNonce((n) => n + 1);
  }, []);

  const handleFinish = useCallback(() => {
    router.replace('/(tabs)');
  }, [router]);

  if (loading) {
    return (
      <ScreenContainer style={styles.flex} edges={['top']}>
        <AppHeader variant="back" title={specialty} subtitle={`Nivel ${level}`} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.clinicalBlue} />
          <Text style={styles.centerText}>Cargando preguntas...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (questions.length === 0) {
    return (
      <ScreenContainer style={styles.flex} edges={['top']}>
        <AppHeader variant="back" title={specialty} />
        <View style={styles.center}>
          <MaterialCommunityIcons name="file-question-outline" size={48} color={Colors.neutral} />
          <Text style={styles.centerTitle}>
            {isReview ? 'No hay errores para repasar' : 'No hay preguntas disponibles'}
          </Text>
          <Text style={styles.centerText}>
            {isReview
              ? '¡Respondiste todo correctamente! No hay nada que repasar.'
              : `Las preguntas para ${specialty} — nivel ${level} no están disponibles todavía.`}
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleFinish}>
            <Text style={styles.primaryButtonText}>Volver al inicio</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  if (showResult) {
    const total = questions.length;
    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const isPerfect = correctCount === total;
    const isGood = correctCount >= total * 0.7;

    return (
      <ScreenContainer scroll edges={['top']}>
        <AppHeader variant="back" title={isReview ? 'Repaso completado' : 'Resultado'} />
        <View testID="quiz-result" style={styles.resultContainer}>
          <Text style={styles.resultEmoji}>
            {isPerfect ? '🏆' : isGood ? '⭐' : '📚'}
          </Text>

          <View
            style={[
              styles.scoreCircle,
              { borderColor: isPerfect ? Colors.successTeal : isGood ? Colors.clinicalBlue : '#C0392B' },
            ]}
          >
            <Text
              style={[
                styles.scorePercent,
                { color: isPerfect ? Colors.successTeal : isGood ? Colors.clinicalBlue : '#C0392B' },
              ]}
            >
              {pct}%
            </Text>
            <Text style={styles.scoreLabel}>
              {correctCount}/{total}
            </Text>
          </View>

          <Text style={styles.resultTitle}>
            {isPerfect ? '¡Perfecto!' : isGood ? '¡Buen trabajo!' : 'Sigue practicando'}
          </Text>
          <Text style={styles.resultSubtitle}>
            {specialty} — Nivel {level}
            {isReview ? ' · Repaso' : ''}
          </Text>
          <Text style={styles.resultMessage}>
            {isPerfect
              ? 'Dominas completamente este tema. ¡Excelente!'
              : isGood
                ? 'Muy buena comprensión del tema.'
                : 'Revisa el material antes de continuar. ¡Puedes mejorar!'}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <MaterialCommunityIcons name="star-four-points" size={16} color={Colors.clinicalBlue} />
              <Text style={styles.statText}>+{totalXp} XP</Text>
            </View>
            {maxCombo >= 2 && (
              <View style={styles.statPill}>
                <MaterialCommunityIcons name="fire" size={16} color="#E8590C" />
                <Text style={styles.statText}>Racha ×{maxCombo}</Text>
              </View>
            )}
          </View>

          {levelCompleted && (
            <View style={styles.levelBadge}>
              <MaterialCommunityIcons name="check-decagram" size={16} color={Colors.successTeal} />
              <Text style={[styles.statText, { color: Colors.successTeal }]}>
                Nivel completado — próximo nivel desbloqueado
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.primaryButton} onPress={handleFinish}>
            <MaterialCommunityIcons name="home" size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Continuar</Text>
          </TouchableOpacity>

          {wrongQuestions.length > 0 && !isReview && (
            <TouchableOpacity testID="review-mistakes" style={styles.secondaryButton} onPress={handleStartReview}>
              <MaterialCommunityIcons name="refresh" size={18} color={Colors.clinicalBlue} />
              <Text style={styles.secondaryButtonText}>Repasar errores ({wrongQuestions.length})</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.secondaryButton} onPress={handleRestart}>
            <MaterialCommunityIcons name="refresh" size={18} color={Colors.clinicalBlue} />
            <Text style={styles.secondaryButtonText}>Repetir quiz</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.flex} edges={['top']}>
      <AppHeader variant="back" title={specialty} subtitle={`Nivel ${level}`} />

      {/* Progress + combo */}
      <View style={styles.topBar}>
        <View style={[styles.progressBar, { backgroundColor: Colors.borderLight }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${((currentIndex + (answered ? 1 : 0)) / questions.length) * 100}%`,
                backgroundColor: Colors.clinicalBlue,
              },
            ]}
          />
        </View>
        {combo >= 2 && (
          <View style={styles.comboPill} testID="combo-indicator">
            <MaterialCommunityIcons name="fire" size={14} color="#E8590C" />
            <Text style={styles.comboText}>×{combo}</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {currentQuestion && (
            <QuestionRenderer
              key={`${currentQuestion.id}-${sessionNonce}`}
              question={currentQuestion}
              index={currentIndex}
              total={questions.length}
              onAnswered={handleAnswered}
            />
          )}
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: Colors.surface, borderTopColor: Colors.borderLight }]}>
        <TouchableOpacity
          testID="next-question"
          style={[
            styles.nextButton,
            { backgroundColor: answered ? Colors.clinicalBlue : Colors.borderLight },
          ]}
          onPress={answered ? handleNext : undefined}
          disabled={!answered}
          activeOpacity={0.8}
        >
          <Text style={[styles.nextButtonText, { color: answered ? '#FFFFFF' : Colors.neutral }]}>
            {!answered
              ? 'Responde para continuar'
              : isLastQuestion
                ? 'Ver resultado'
                : 'Siguiente'}
          </Text>
          {answered && (
            <MaterialCommunityIcons
              name={isLastQuestion ? 'flag-checkered' : 'arrow-right'}
              size={20}
              color="#FFFFFF"
            />
          )}
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  centerText: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: Colors.neutral,
    textAlign: 'center',
    lineHeight: 20,
  },
  centerTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    color: Colors.deepSlate,
    textAlign: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingBottom: 4,
  },
  progressBar: {
    height: 6,
    flex: 1,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    minWidth: 6,
  },
  comboPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E8590C14',
  },
  comboText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#E8590C',
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
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
  resultContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 40,
    gap: 16,
  },
  resultEmoji: {
    fontSize: 56,
  },
  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scorePercent: {
    fontFamily: 'Manrope-Bold',
    fontSize: 36,
  },
  scoreLabel: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: Colors.neutral,
  },
  resultTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 28,
    color: Colors.deepSlate,
    textAlign: 'center',
  },
  resultSubtitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.neutral,
    textAlign: 'center',
  },
  resultMessage: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: Colors.neutral,
    textAlign: 'center',
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#0077B615',
  },
  statText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.clinicalBlue,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#006B5F14',
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
    backgroundColor: Colors.clinicalBlue,
    borderBottomWidth: 4,
    borderBottomColor: '#005C8A',
  },
  primaryButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  secondaryButton: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
    backgroundColor: Colors.surface,
  },
  secondaryButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: Colors.clinicalBlue,
  },
});
