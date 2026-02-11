import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as Sentry from '@sentry/react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo.componentStack } },
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <View className="flex-1 bg-gray-900 justify-center items-center p-5">
          <View className="items-center max-w-[400px]">
            <Text className="text-2xl font-bold text-white mb-4 text-center">
              Oops! Something went wrong
            </Text>
            <Text className="text-base text-gray-300 mb-6 text-center leading-6">
              We've been notified and are working on a fix.
            </Text>
            {__DEV__ && this.state.error && (
              <View className="bg-gray-800 p-4 rounded-lg mb-6 w-full">
                <Text className="text-red-400 text-xs font-mono">{this.state.error.toString()}</Text>
              </View>
            )}
            <TouchableOpacity
              className="bg-brand-terracotta px-8 py-3 rounded-lg"
              onPress={this.handleReset}
            >
              <Text className="text-white text-base font-bold">Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
