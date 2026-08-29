import React, { useState, useCallback, useEffect } from 'react';
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
import { Colors } from '@/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';
import { useProgress } from '@/src/hooks/useProgress';
import { useBadges } from '@/src/hooks/useBadges';
import { fetchQuizQuestions, type QuizQuestion } from '@/src/services/quiz';
import { recordStudyActivity } from '@/src/services/activity';

type AnswerState = 'idle' | 'correct' | 'incorrect';

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

export default function QuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { completeLevel, completedQuizCount } = useProgress();
  const { checkAndAwardBadge } = useBadges();

  const { specialty, level } = parseQuizId(id ?? 'Operatoria Dental-1');

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>('idle');
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [levelCompleted, setLevelCompleted] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchQuizQuestions(specialty, level).then((qs) => {
      if (cancelled) return;
      setQuestions(qs);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [specialty, level]);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const correctCount = answers.filter((a, i) => a === questions[i]?.correctIndex).length;

  const handleSelectOption = useCallback(
    (index: number) => {
      if (answerState !== 'idle' || !currentQuestion) return;
      setSelectedOption(index);
      setAnswerState(index === currentQuestion.correctIndex ? 'correct' : 'incorrect');
    },
    [answerState, currentQuestion]
  );

  const handleNext = useCallback(() => {
    if (selectedOption === null) return;

    const newAnswers = [...answers, selectedOption];
    setAnswers(newAnswers);

    if (isLastQuestion) {
      const finalScore = newAnswers.filter((a, i) => a === questions[i]?.correctIndex).length;
      const passed = questions.length > 0 && finalScore / questions.length >= 0.7;
      if (passed) {
        completeLevel(specialty, level).then((ok) => {
          if (ok) setLevelCompleted(true);
        });
        // Registra actividad (racha) y otorga badges de quiz/nivel.
        if (user) {
          void recordStudyActivity(user.id).then((s) => {
            if (s >= 3) void checkAndAwardBadge('streak', s);
          });
        }
        void checkAndAwardBadge('quiz_complete', completedQuizCount + 1);
        void checkAndAwardBadge('level_up', level);
      }
      setShowResult(true);
    } else {
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
  }, [
    selectedOption,
    answers,
    isLastQuestion,
    completeLevel,
    specialty,
    level,
    questions,
    fadeAnim,
    user,
    checkAndAwardBadge,
    completedQuizCount,
  ]);

  const handleFinish = useCallback(() => {
    router.replace('/(tabs)');
  }, [router]);

  const getOptionStyle = useCallback(
    (index: number) => {
      if (answerState === 'idle') {
        return {
          backgroundColor: selectedOption === index ? Colors.clinicalBlue : Colors.surface,
          borderColor: selectedOption === index ? '#005C8A' : Colors.borderLight,
        };
      }
      if (index === currentQuestion?.correctIndex) {
        return { backgroundColor: '#006B5F', borderColor: '#004037' };
      }
      if (index === selectedOption && answerState === 'incorrect') {
        return { backgroundColor: '#C0392B', borderColor: '#962D22' };
      }
      return { backgroundColor: Colors.surface, borderColor: Colors.borderLight };
    },
    [answerState, selectedOption, currentQuestion]
  );

  const getOptionTextColor = useCallback(
    (index: number) => {
      if (answerState === 'idle' && selectedOption === index) return '#FFFFFF';
      if (answerState !== 'idle') {
        if (index === currentQuestion?.correctIndex) return '#FFFFFF';
        if (index === selectedOption) return '#FFFFFF';
      }
      return Colors.deepSlate;
    },
    [answerState, selectedOption, currentQuestion]
  );

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

  if (showResult) {
    const total = questions.length;
    const pct = Math.round((correctCount / total) * 100);
    const isPerfect = correctCount === total;
    const isGood = correctCount >= total * 0.7;
    const xpEarned = Math.round((correctCount / total) * 100);

    return (
      <ScreenContainer scroll edges={['top']}>
        <AppHeader variant="back" title="Resultado" />
        <View testID="quiz-result" style={styles.resultContainer}>
          <Text style={styles.resultEmoji}>{isPerfect ? '🏆' : isGood ? '⭐' : '📚'}</Text>

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
          </Text>
          <Text style={styles.resultMessage}>
            {isPerfect
              ? 'Dominas completamente este tema. ¡Excelente!'
              : isGood
              ? 'Muy buena comprensión del tema. Repasa los conceptos fallados.'
              : 'Revisa el material antes de continuar. ¡Puedes mejorar!'}
          </Text>

          <View style={styles.xpBadge}>
            <MaterialCommunityIcons name="star-four-points" size={16} color={Colors.clinicalBlue} />
            <Text style={styles.xpText}>+{xpEarned} XP ganados</Text>
          </View>

          {levelCompleted && (
            <View style={styles.levelBadge}>
              <MaterialCommunityIcons name="check-decagram" size={16} color={Colors.successTeal} />
              <Text style={[styles.xpText, { color: Colors.successTeal }]}>
                Nivel completado — próximo nivel desbloqueado
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
            <MaterialCommunityIcons name="home" size={18} color="#FFFFFF" />
            <Text style={styles.finishButtonText}>Volver al inicio</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setCurrentIndex(0);
              setSelectedOption(null);
              setAnswerState('idle');
              setAnswers([]);
              setShowResult(false);
            }}
          >
            <MaterialCommunityIcons name="refresh" size={18} color={Colors.clinicalBlue} />
            <Text style={styles.retryButtonText}>Repetir quiz</Text>
          </TouchableOpacity>
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
          <Text style={styles.centerTitle}>No hay preguntas disponibles</Text>
          <Text style={styles.centerText}>
            Las preguntas para {specialty} — nivel {level} no están disponibles todavía.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleFinish}>
            <Text style={styles.retryButtonText}>Volver al inicio</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.flex} edges={['top']}>
      <AppHeader variant="back" title={specialty} subtitle={`Nivel ${level}`} />

      {/* Progreso */}
      <View style={[styles.progressBar, { backgroundColor: Colors.borderLight }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${((currentIndex + (answerState !== 'idle' ? 1 : 0)) / questions.length) * 100}%`,
              backgroundColor: Colors.clinicalBlue,
            },
          ]}
        />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text testID="question-text" style={styles.question}>
            {currentQuestion.question}
          </Text>

          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                testID={`option-${index}`}
                style={[styles.option, getOptionStyle(index)]}
                onPress={() => handleSelectOption(index)}
                activeOpacity={answerState !== 'idle' ? 1 : 0.7}
              >
                <View style={styles.optionContent}>
                  <View
                    style={[
                      styles.optionBullet,
                      { borderColor: getOptionTextColor(index) === '#FFFFFF' ? 'rgba(255,255,255,0.5)' : Colors.borderLight },
                    ]}
                  >
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

          {answerState !== 'idle' && (
            <View
              style={[
                styles.explanation,
                {
                  backgroundColor: answerState === 'correct' ? '#E8F5F3' : '#FDE8E7',
                  borderColor: answerState === 'correct' ? Colors.successTeal : '#C0392B',
                },
              ]}
            >
              <View style={styles.explanationHeader}>
                <MaterialCommunityIcons
                  name={answerState === 'correct' ? 'lightbulb-on' : 'information'}
                  size={18}
                  color={answerState === 'correct' ? Colors.successTeal : '#C0392B'}
                />
                <Text
                  style={[
                    styles.explanationTitle,
                    { color: answerState === 'correct' ? Colors.successTeal : '#C0392B' },
                  ]}
                >
                  {answerState === 'correct' ? '¡Correcto!' : 'Respuesta incorrecta'}
                </Text>
              </View>
              <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: Colors.surface, borderTopColor: Colors.borderLight }]}>
        <TouchableOpacity
          testID="next-question"
          style={[
            styles.nextButton,
            {
              backgroundColor: answerState !== 'idle' ? Colors.clinicalBlue : Colors.borderLight,
            },
          ]}
          onPress={answerState !== 'idle' ? handleNext : undefined}
          disabled={answerState === 'idle'}
          activeOpacity={0.8}
        >
          <Text style={[styles.nextButtonText, { color: answerState !== 'idle' ? '#FFFFFF' : Colors.neutral }]}>
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
    color: Colors.deepSlate,
    marginBottom: 24,
  },
  optionsContainer: {
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
    color: Colors.deepSlate,
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
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#0077B615',
  },
  xpText: {
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
  finishButton: {
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
    borderColor: Colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
    backgroundColor: Colors.surface,
  },
  retryButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: Colors.clinicalBlue,
  },
});
