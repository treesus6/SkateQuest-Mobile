import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import TrickSkillTree from '../../components/TrickSkillTree';
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
beforeEach(() => jest.clearAllMocks());
it('routes a selected locked trick to the existing coach without adding fake progress', async () => {
  const onStart = jest.fn();
  const view = await render(
    <TrickSkillTree progress={[]} onStart={onStart} onAttempt={jest.fn()} onLand={jest.fn()} />
  );
  await fireEvent.press(view.getByText('Kickflip'));
  expect(view.queryByText('START LEARNING')).toBeNull();
  await fireEvent.press(view.getByText('ASK AI COACH ↗'));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/ai-coach', params: { trick: 'Kickflip' } });
  expect(onStart).not.toHaveBeenCalled();
});
it('logs an attempt against the existing Supabase tracker id rather than creating another trick', async () => {
  const progress = { id: 'saved-ollie', trick_name: 'Ollie', status: 'trying', attempts: 7 };
  const onAttempt = jest.fn();
  const onStart = jest.fn();
  const view = await render(
    <TrickSkillTree
      progress={[progress]}
      onStart={onStart}
      onAttempt={onAttempt}
      onLand={jest.fn()}
    />
  );
  await fireEvent.press(view.getByText('Ollie'));
  await fireEvent.press(view.getByText('+1 ATTEMPT'));
  expect(onAttempt).toHaveBeenCalledWith(progress);
  expect(onStart).not.toHaveBeenCalled();
});
