/**
 * ErrorBoundary — catches render errors (e.g. a corrupt 3D model) and shows an
 * error state with a retry action instead of crashing the screen.
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
        <View
          className="flex-1 items-center justify-center gap-2.5 rounded-2xl bg-sky-light px-6"
          testID={this.props.testID ?? 'error-boundary'}
        >
          <MaterialCommunityIcons name="alert-circle-outline" size={40} color="#C0392B" />
          <Text className="font-heading-bold text-base text-deep-slate">Algo salió mal</Text>
          <Text className="text-center font-sans text-[13px] leading-[19px] text-neutral">
            No se pudo mostrar este contenido. Intenta de nuevo.
          </Text>
          <TouchableOpacity
            className="flex-row items-center gap-1.5 rounded-[12px] bg-clinical-blue px-[18px] py-2.5"
            onPress={this.handleRetry}
          >
            <MaterialCommunityIcons name="refresh" size={16} color="#FFFFFF" />
            <Text className="font-inter-semibold text-sm text-white">Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
