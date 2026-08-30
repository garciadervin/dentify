/**
 * ErrorBoundary — catches render errors (e.g. a corrupt 3D model) and shows an
 * error state with a retry action instead of crashing the screen.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

interface Props {
  children: React.ReactNode;
  testID?: string;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('ErrorBoundary caught:', error);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container} testID={this.props.testID ?? 'error-boundary'}>
          <MaterialCommunityIcons name="alert-circle-outline" size={40} color="#C0392B" />
          <Text style={styles.title}>Algo salió mal</Text>
          <Text style={styles.message}>No se pudo mostrar este contenido. Intenta de nuevo.</Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <MaterialCommunityIcons name="refresh" size={16} color="#FFFFFF" />
            <Text style={styles.buttonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
    backgroundColor: Colors.skyLight,
    borderRadius: 24,
  },
  title: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: Colors.deepSlate,
  },
  message: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: Colors.neutral,
    textAlign: 'center',
    lineHeight: 19,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.clinicalBlue,
  },
  buttonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
