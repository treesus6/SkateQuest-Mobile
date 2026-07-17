import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Input from '../../../components/ui/Input';

describe('Input', () => {
  it('renders with placeholder', async () => {
    const { getByPlaceholderText } = await render(<Input placeholder="Enter text" />);
    expect(getByPlaceholderText('Enter text')).toBeTruthy();
  });

  it('renders with label', async () => {
    const { getByText } = await render(<Input label="Email" placeholder="Enter email" />);
    expect(getByText('Email')).toBeTruthy();
  });

  it('shows error message', async () => {
    const { getByText } = await render(<Input error="Required field" placeholder="Name" />);
    expect(getByText('Required field')).toBeTruthy();
  });

  it('calls onChangeText', async () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = await render(
      <Input placeholder="Type here" onChangeText={onChangeText} />
    );
    fireEvent.changeText(getByPlaceholderText('Type here'), 'hello');
    expect(onChangeText).toHaveBeenCalledWith('hello');
  });

  it('does not show error when not provided', async () => {
    const { queryByText } = await render(<Input placeholder="Name" />);
    expect(queryByText('Required field')).toBeNull();
  });
});
