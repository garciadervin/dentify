import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProgress } from '@/src/hooks/useProgress';

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
}

/**
 * Mock dental quiz questions covering real clinical content.
 * Used as placeholder until API integration is complete.
 */
const MOCK_QUIZZES: Record<string, Question[]> = {
  'quiz-1': [
    {
      question: '¿Cuál es el nervio craneal responsable de la inervación sensitiva de la cara?',
      options: [
        'Nervio Facial (VII)',
        'Nervio Trigémino (V)',
        'Nervio Glosofaríngeo (IX)',
        'Nervio Hipogloso (XII)',
      ],
      correctIndex: 1,
    },
  ],
  'quiz-2': [
    {
      question: '¿Qué tipo de articulación es la articulación temporomandibular (ATM)?',
      options: [
        'Sinovial de tipo bisagra',
        'Sinovial de tipo condíleo',
        'Fibrosa de tipo sutura',
        'Cartilaginosa de tipo sínfisis',
      ],
      correctIndex: 1,
    },
    {
      question:
        '¿Cuál es el primer molar permanente en erupcionar en la arcada dental?',
      options: [
        'Incisivo central inferior',
        'Primer molar superior',
        'Primer molar inferior',
        'Canino superior',
      ],
      correctIndex: 2,
    },
    {
      question:
        '¿Qué estructura anatómica separa la cavidad oral de la cavidad nasal?',
      options: [
        'Paladar blando',
        'Paladar duro',
        'Úvula',
        'Arco palatogloso',
      ],
      correctIndex: 1,
    },
  ],
};

/**
 * QuizScreen displays a mock dental quiz with multiple-choice questions.
 * Users select an option, navigate through questions, and see results at the end.
 */
export default function QuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { completeLevel } = useProgress();

  const questions = MOCK_QUIZZES[id ?? 'quiz-1'] ?? MOCK_QUIZZES['quiz-1'];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;

  const handleSelectOption = useCallback((index: number) => {
    setSelectedOption(index);
  }, []);

  const handleNext = useCallback(() => {
    if (selectedOption === null) return;

    const newAnswers = [...answers, selectedOption];
    setAnswers(newAnswers);

    if (isLastQuestion) {
      // Quiz complete — show result
      setShowResult(true);
      // Call completeLevel to mark progress
      completeLevel('Operatoria Dental', currentIndex + 1);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
    }
  }, [selectedOption, answers, isLastQuestion, currentIndex, completeLevel]);

  const handleFinish = useCallback(() => {
    router.replace('/(tabs)');
  }, [router]);

  // Calculate score
  const correctCount = answers.filter(
    (answer, idx) => answer === questions[idx].correctIndex
  ).length;

  if (showResult) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.skyLight }}
        edges={['top']}
      >
        <View
          testID="quiz-result"
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
          }}
        >
          <Text
            style={{
              fontFamily: 'Manrope-Bold',
              fontSize: 28,
              color: colors.deepSlate,
              marginBottom: 12,
            }}
          >
            ¡Quiz Completado!
          </Text>
          <Text
            style={{
              fontFamily: 'Inter-SemiBold',
              fontSize: 48,
              color: colors.clinicalBlue,
              marginBottom: 8,
            }}
          >
            {correctCount}/{questions.length}
          </Text>
          <Text
            style={{
              fontFamily: 'Inter',
              fontSize: 16,
              color: colors.neutral,
              marginBottom: 32,
              textAlign: 'center',
            }}
          >
            {correctCount === questions.length
              ? '¡Perfecto! Dominas el tema.'
              : correctCount >= questions.length / 2
                ? 'Buen trabajo, sigue practicando.'
                : 'Sigue estudiando, puedes mejorar.'}
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: colors.clinicalBlue,
              borderRadius: 12,
              paddingVertical: 14,
              paddingHorizontal: 48,
              alignItems: 'center',
            }}
            onPress={handleFinish}
          >
            <Text
              style={{
                fontFamily: 'Inter-SemiBold',
                fontSize: 16,
                color: '#FFFFFF',
              }}
            >
              Volver al Dashboard
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.skyLight }} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 }}
      >
        {/* Progress indicator */}
        <Text
          style={{
            fontFamily: 'Inter-SemiBold',
            fontSize: 12,
            color: colors.neutral,
            marginBottom: 8,
          }}
        >
          Pregunta {currentIndex + 1} de {questions.length}
        </Text>

        {/* Progress bar */}
        <View
          style={{
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.borderLight,
            marginBottom: 24,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${((currentIndex + 1) / questions.length) * 100}%`,
              height: '100%',
              borderRadius: 2,
              backgroundColor: colors.clinicalBlue,
            }}
          />
        </View>

        {/* Question text */}
        <Text
          testID="question-text"
          style={{
            fontFamily: 'Manrope-Bold',
            fontSize: 20,
            color: colors.deepSlate,
            marginBottom: 24,
            lineHeight: 28,
          }}
        >
          {currentQuestion.question}
        </Text>

        {/* Options */}
        {currentQuestion.options.map((option, index) => {
          const isSelected = selectedOption === index;
          return (
            <TouchableOpacity
              key={index}
              testID={`option-${index}`}
              style={{
                backgroundColor: isSelected ? colors.clinicalBlue : colors.surface,
                borderRadius: 12,
                paddingVertical: 14,
                paddingHorizontal: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: isSelected ? colors.clinicalBlue : colors.borderLight,
              }}
              onPress={() => handleSelectOption(index)}
            >
              <Text
                style={{
                  fontFamily: 'Inter',
                  fontSize: 16,
                  color: isSelected ? '#FFFFFF' : colors.deepSlate,
                }}
              >
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Next / Finish button */}
        <TouchableOpacity
          testID="next-question"
          style={{
            backgroundColor: selectedOption !== null ? colors.clinicalBlue : colors.neutral,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
            marginTop: 16,
            opacity: selectedOption !== null ? 1 : 0.5,
          }}
          onPress={handleNext}
          disabled={selectedOption === null}
        >
          <Text
            style={{
              fontFamily: 'Inter-SemiBold',
              fontSize: 16,
              color: '#FFFFFF',
            }}
          >
            {isLastQuestion ? 'Finalizar' : 'Siguiente'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
