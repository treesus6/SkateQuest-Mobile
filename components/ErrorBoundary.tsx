import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

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
    console.error('[ErrorBoundary] Caught error:', error.message);
    console.error('[ErrorBoundary] Stack:', errorInfo.componentStack);
    try {
      const Sentry = require('@sentry/react-native');
      Sentry.captureException(error, {
        contexts: { react: { componentStack: errorInfo.componentStack } },
      });
    } catch (e) {
      console.error('[ErrorBoundary] Sentry not available:', e);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <View style={styles.container}>
          <View style={styles.inner}>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>We've been notified and are working on a fix.</Text>
            {this.state.error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{this.state.error.toString()}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.button} onPress={this.handleReset}>
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center', padding: 20 },
  inner: { alignItems: 'center', maxWidth: 400, width: '100%' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#9CA3AF', marginBottom: 20, textAlign: 'center', lineHeight: 22 },
  errorBox: { backgroundColor: '#1F2937', padding: 16, borderRadius: 8, marginBottom: 20, width: '100%' },
  errorText: { color: '#F87171', fontSize: 12, fontFamily: 'monospace' },
  button: { backgroundColor: '#d2673d', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default ErrorBoundary;
