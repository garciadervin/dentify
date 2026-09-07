import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
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
    setQuestions(wrongQuestions);
    setIsReview(true);
    setResults([]);
    setCombo(0);
    setMaxCombo(0);
    setTotalXp(0);
    setCurrentIndex(0);
    setAnswered(false);
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
      <ScreenContainer style={{ flex: 1 }} edges={['top']}>
        <AppHeader variant="back" title={specialty} subtitle={`Nivel ${level}`} />
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <ActivityIndicator size="large" color={Colors.clinicalBlue} />
          <Text className="text-center font-sans text-[14px] leading-[20px] text-neutral">
            Cargando preguntas...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  if (questions.length === 0) {
    return (
      <ScreenContainer style={{ flex: 1 }} edges={['top']}>
        <AppHeader variant="back" title={specialty} />
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <MaterialCommunityIcons name="file-question-outline" size={48} color={Colors.neutral} />
          <Text className="text-center font-heading-bold text-[18px] text-deep-slate">
            {isReview ? 'No hay errores para repasar' : 'No hay preguntas disponibles'}
          </Text>
          <Text className="text-center font-sans text-[14px] leading-[20px] text-neutral">
            {isReview
              ? '¡Respondiste todo correctamente! No hay nada que repasar.'
              : `Las preguntas para ${specialty} — nivel ${level} no están disponibles todavía.`}
          </Text>
          <TouchableOpacity
            className="flex-row items-center justify-center gap-2 self-stretch rounded-[14px] border-b-4 border-b-clinical-dark bg-clinical-blue px-8 py-3.5"
            onPress={handleFinish}
          >
            <Text className="font-inter-semibold text-[16px] text-white">Volver al inicio</Text>
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
        <View testID="quiz-result" className="items-center gap-4 px-8 py-10">
          <Text className="text-[56px]">
            {isPerfect ? '🏆' : isGood ? '⭐' : '📚'}
          </Text>

          <View
            className={`h-[140px] w-[140px] items-center justify-center rounded-full border-[6px] ${
              isPerfect ? 'border-success-teal' : isGood ? 'border-clinical-blue' : 'border-error'
            }`}
          >
            <Text
              className={`font-heading-bold text-[36px] ${
                isPerfect ? 'text-success-teal' : isGood ? 'text-clinical-blue' : 'text-error'
              }`}
            >
              {pct}%
            </Text>
            <Text className="font-sans text-[14px] text-neutral">
              {correctCount}/{total}
            </Text>
          </View>

          <Text className="text-center font-heading-bold text-[28px] text-deep-slate">
            {isPerfect ? '¡Perfecto!' : isGood ? '¡Buen trabajo!' : 'Sigue practicando'}
          </Text>
          <Text className="text-center font-inter-semibold text-[14px] text-neutral">
            {specialty} — Nivel {level}
            {isReview ? ' · Repaso' : ''}
          </Text>
          <Text className="text-center font-sans text-[15px] leading-[22px] text-neutral">
            {isPerfect
              ? 'Dominas completamente este tema. ¡Excelente!'
              : isGood
                ? 'Muy buena comprensión del tema.'
                : 'Revisa el material antes de continuar. ¡Puedes mejorar!'}
          </Text>

          <View className="flex-row flex-wrap items-center justify-center gap-2.5">
            <View className="flex-row items-center gap-1.5 rounded-[20px] bg-[#0077B615] px-4 py-2">
              <MaterialCommunityIcons name="star-four-points" size={16} color={Colors.clinicalBlue} />
              <Text className="font-inter-semibold text-[14px] text-clinical-blue">+{totalXp} XP</Text>
            </View>
            {maxCombo >= 2 && (
              <View className="flex-row items-center gap-1.5 rounded-[20px] bg-[#0077B615] px-4 py-2">
                <MaterialCommunityIcons name="fire" size={16} color="#E8590C" />
                <Text className="font-inter-semibold text-[14px] text-clinical-blue">Racha ×{maxCombo}</Text>
              </View>
            )}
          </View>

          {levelCompleted && (
            <View className="flex-row items-center gap-1.5 rounded-[20px] bg-[#006B5F14] px-4 py-2">
              <MaterialCommunityIcons name="check-decagram" size={16} color={Colors.successTeal} />
              <Text className="font-inter-semibold text-[14px] text-success-teal">
                Nivel completado — próximo nivel desbloqueado
              </Text>
            </View>
          )}

          <TouchableOpacity
            className="flex-row items-center justify-center gap-2 self-stretch rounded-[14px] border-b-4 border-b-clinical-dark bg-clinical-blue px-8 py-3.5"
            onPress={handleFinish}
          >
            <MaterialCommunityIcons name="home" size={18} color="#FFFFFF" />
            <Text className="font-inter-semibold text-[16px] text-white">Continuar</Text>
          </TouchableOpacity>

          {wrongQuestions.length > 0 && !isReview && (
            <TouchableOpacity
              testID="review-mistakes"
              className="flex-row items-center justify-center gap-2 self-stretch rounded-[14px] border-[1.5px] border-border-light bg-surface px-8 py-3"
              onPress={handleStartReview}
            >
              <MaterialCommunityIcons name="refresh" size={18} color={Colors.clinicalBlue} />
              <Text className="font-inter-semibold text-[15px] text-clinical-blue">
                Repasar errores ({wrongQuestions.length})
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            className="flex-row items-center justify-center gap-2 self-stretch rounded-[14px] border-[1.5px] border-border-light bg-surface px-8 py-3"
            onPress={handleRestart}
          >
            <MaterialCommunityIcons name="refresh" size={18} color={Colors.clinicalBlue} />
            <Text className="font-inter-semibold text-[15px] text-clinical-blue">Repetir quiz</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={{ flex: 1 }} edges={['top']}>
      <AppHeader variant="back" title={specialty} subtitle={`Nivel ${level}`} />

      {/* Progress + combo */}
      <View className="flex-row items-center gap-2.5 px-6 pb-1">
        <View className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-border-light">
          <View
            className="h-1.5 min-w-[6px] rounded-[3px] bg-clinical-blue"
            style={{ width: `${((currentIndex + (answered ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </View>
        {combo >= 2 && (
          <View className="flex-row items-center gap-1 rounded-[12px] bg-[#E8590C14] px-2.5 py-1" testID="combo-indicator">
            <MaterialCommunityIcons name="fire" size={14} color="#E8590C" />
            <Text className="font-inter-semibold text-[12px] text-[#E8590C]">×{combo}</Text>
          </View>
        )}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pt-6 pb-4"
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

      <View className="border-t border-border-light bg-surface px-6 py-4">
        <TouchableOpacity
          testID="next-question"
          className={`flex-row items-center justify-center gap-2 rounded-[14px] px-5 py-3.5 ${
            answered ? 'bg-clinical-blue' : 'bg-border-light'
          }`}
          onPress={answered ? handleNext : undefined}
          disabled={!answered}
          activeOpacity={0.8}
        >
          <Text className={`font-inter-semibold text-[16px] ${answered ? 'text-white' : 'text-neutral'}`}>
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
