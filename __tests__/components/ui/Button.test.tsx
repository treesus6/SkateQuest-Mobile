import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Button from '../../../components/ui/Button';

describe('Button', () => {
  it('renders with title', async () => {
    const { getByText } = await render(<Button title="Press me" />);
    expect(getByText('Press me')).toBeTruthy();
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<Button title="Press" onPress={onPress} />);
    fireEvent.press(getByText('Press'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<Button title="Press" onPress={onPress} disabled />);
    fireEvent.press(getByText('Press'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders all variants without crashing', async () => {
    const variants = ['primary', 'secondary', 'outline', 'ghost', 'danger'] as const;
    for (const variant of variants) {
      const { getByText } = await render(<Button title={variant} variant={variant} />);
      expect(getByText(variant)).toBeTruthy();
    }
  });

  it('renders all sizes without crashing', async () => {
    const sizes = ['sm', 'md', 'lg'] as const;
    for (const size of sizes) {
      const { getByText } = await render(<Button title={size} size={size} />);
      expect(getByText(size)).toBeTruthy();
    }
  });
});
