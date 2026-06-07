---
name: sq-qa
description: Testing for SkateQuest-Mobile using Jest and React Native Testing Library. Use when writing unit tests, hook tests, or debugging component behavior.
---

# QA & Testing Standards — SkateQuest-Mobile

## Required Mocks (jest.setup.ts)
```ts
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('@rnmapbox/maps', () => ({
  MapView: 'MapView', Camera: 'Camera', MarkerView: 'MarkerView',
  ShapeSource: 'ShapeSource', SymbolLayer: 'SymbolLayer',
}));
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
  },
}));
jest.mock('expo-font');
jest.mock('expo-splash-screen', () => ({ hideAsync: jest.fn(), preventAutoHideAsync: jest.fn() }));
```

## Component Test Pattern
```tsx
it('displays park name', () => {
  render(<SkateparkCard parkId="123" parkName="Lincoln City Skatepark" />);
  expect(screen.getByText('Lincoln City Skatepark')).toBeTruthy();
});
```

## Async Pattern
```tsx
await waitFor(() => { expect(screen.getByText('Lincoln City')).toBeTruthy(); });
const parkName = await screen.findByText('Lincoln City');
```

## Rules
- Prefer `getByText`/`getByRole` over testID
- Always `await` async operations in `act()`
- Always mock native modules — if it requires native code, mock it
