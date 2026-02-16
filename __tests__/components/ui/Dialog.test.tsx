import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Dialog from '../../../components/ui/Dialog';

// Mock lucide-react-native
jest.mock('lucide-react-native', () => ({
  X: () => null,
}));

describe('Dialog', () => {
  it('renders title and message when visible', () => {
    const { getByText } = render(
      <Dialog visible={true} onClose={jest.fn()} title="Confirm" message="Are you sure?" />
    );
    expect(getByText('Confirm')).toBeTruthy();
    expect(getByText('Are you sure?')).toBeTruthy();
  });

  it('shows confirm and cancel buttons when onConfirm provided', () => {
    const { getByText } = render(
      <Dialog
        visible={true}
        onClose={jest.fn()}
        title="Delete"
        message="Delete this item?"
        onConfirm={jest.fn()}
      />
    );
    expect(getByText('OK')).toBeTruthy();
    expect(getByText('Cancel')).toBeTruthy();
  });

  it('shows only OK button when no onConfirm', () => {
    const { getByText, queryByText } = render(
      <Dialog visible={true} onClose={jest.fn()} title="Info" message="Something happened" />
    );
    expect(getByText('OK')).toBeTruthy();
    expect(queryByText('Cancel')).toBeNull();
  });

  it('calls onConfirm and onClose when confirm is pressed', () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    const { getByText } = render(
      <Dialog
        visible={true}
        onClose={onClose}
        title="Delete"
        message="Delete?"
        onConfirm={onConfirm}
      />
    );
    fireEvent.press(getByText('OK'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('uses custom button labels', () => {
    const { getByText } = render(
      <Dialog
        visible={true}
        onClose={jest.fn()}
        title="Remove Item"
        message="Remove this?"
        confirmLabel="Yes, Remove"
        cancelLabel="Keep"
        onConfirm={jest.fn()}
      />
    );
    expect(getByText('Yes, Remove')).toBeTruthy();
    expect(getByText('Keep')).toBeTruthy();
  });
});
