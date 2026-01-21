# SkateQuest-Mobile Code Style Guide

**Last Updated:** January 21, 2026
**Version:** 1.0.0

This document establishes mandatory coding standards for all AI coding agents and human contributors working on SkateQuest-Mobile. All code must be fully optimized before submission.

---

## Core Principle: Fully Optimized Code

**"Fully optimized"** means:
- ✅ Algorithmic efficiency (proper data structures, memoization where needed)
- ✅ React Native performance (FlatList instead of ScrollView, proper re-render prevention)
- ✅ Proper TypeScript types (no `any`, comprehensive interfaces)
- ✅ Following established conventions and best practices
- ✅ Zero technical debt, no commented-out code
- ✅ Comprehensive error handling
- ✅ Security best practices enforced

**Penalty:** Submitting non-optimized code results in immediate rejection and requires full rework.

---

## Package Management & Tooling

### Package Manager
- **Use npm** for all dependency management (aligned with Expo SDK 54)
- Always commit `package-lock.json`
- Never use `^` for Expo packages (use `~` for minor version locking)
- Run `npm audit` regularly and address high/critical vulnerabilities

### Required Tools
```json
{
  "typescript": "^5.1.3",
  "eslint": "^9.39.2",
  "prettier": "^3.0.0",
  "jest": "~29.7.0"
}
```

### Expo SDK Alignment
- **Always** use Expo SDK-compatible versions
- Prefer Expo-managed packages over bare React Native packages
- Example: Use `expo-av` instead of `react-native-video`
- Check compatibility: https://docs.expo.dev/versions/latest/

### Modern Libraries (Preferred)
- **State Management:** Use React Context API + hooks, or Zustand for complex state
- **Data Fetching:** Use `@tanstack/react-query` for async state management
- **Forms:** Use `react-hook-form` with Yup validation (already installed)
- **Navigation:** React Navigation v6 (already installed)
- **Maps:** `@rnmapbox/maps` (already installed)
- **Analytics:** `posthog-js` (already installed)

---

## TypeScript Standards

### Type Safety
```typescript
// ✅ GOOD: Explicit types, no any
interface User {
  id: string;
  email: string;
  profile: UserProfile | null;
}

function getUser(id: string): Promise<User> {
  return supabase.from('users').select('*').eq('id', id).single();
}

// ❌ BAD: Using any
function getUser(id: any): Promise<any> {
  return supabase.from('users').select('*').eq('id', id).single();
}
```

### Enums vs Union Types
```typescript
// ✅ GOOD: Use const objects with 'as const'
export const MediaType = {
  PHOTO: 'photo',
  VIDEO: 'video',
} as const;
export type MediaType = (typeof MediaType)[keyof typeof MediaType];

// ❌ AVOID: Traditional enums (they add runtime code)
enum MediaType {
  PHOTO = 'photo',
  VIDEO = 'video',
}
```

### Interface vs Type
```typescript
// ✅ Use interface for object shapes (can be extended)
interface SkateparkDetails {
  id: string;
  name: string;
  location: Location;
}

// ✅ Use type for unions, intersections, or primitives
type SkateparkStatus = 'active' | 'closed' | 'under_construction';
type SkateparkWithStatus = SkateparkDetails & { status: SkateparkStatus };
```

### Strict Mode
- Enable all strict TypeScript options in `tsconfig.json`
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

---

## React Native Performance

### List Rendering
```typescript
// ✅ GOOD: FlatList with proper optimization
<FlatList
  data={skateparks}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <SkateparkCard skatepark={item} />}
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  windowSize={5}
  removeClippedSubviews={true}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
/>

// ❌ BAD: ScrollView with map (re-renders everything)
<ScrollView>
  {skateparks.map((park) => (
    <SkateparkCard key={park.id} skatepark={park} />
  ))}
</ScrollView>
```

### Memoization
```typescript
// ✅ GOOD: Memoize expensive components
import React, { memo, useMemo, useCallback } from 'react';

const SkateparkCard = memo(({ skatepark, onPress }: Props) => {
  const formattedDistance = useMemo(
    () => formatDistance(skatepark.distance),
    [skatepark.distance]
  );

  return (
    <TouchableOpacity onPress={onPress}>
      <Text>{skatepark.name}</Text>
      <Text>{formattedDistance}</Text>
    </TouchableOpacity>
  );
});

// ❌ BAD: No memoization, recalculates on every render
const SkateparkCard = ({ skatepark, onPress }: Props) => {
  const formattedDistance = formatDistance(skatepark.distance); // Recalculated every render!
  return <TouchableOpacity onPress={onPress}>...</TouchableOpacity>;
};
```

### Image Optimization
```typescript
// ✅ GOOD: Use Expo Image with proper sizing
import { Image } from 'expo-image';

<Image
  source={{ uri: imageUrl }}
  style={{ width: 300, height: 200 }}
  contentFit="cover"
  cachePolicy="memory-disk"
  placeholder={blurhash}
  transition={200}
/>

// ❌ BAD: React Native Image without optimization
import { Image } from 'react-native';

<Image source={{ uri: imageUrl }} style={{ width: 300, height: 200 }} />
```

---

## Code Formatting & Linting

### Prettier Configuration
```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "arrowParens": "always"
}
```

### ESLint Rules
- Use `eslint-config-expo` as base
- Extend with TypeScript-specific rules
- **Never** disable rules without documented justification
- Run `npm run lint` before every commit

### Naming Conventions
```typescript
// ✅ GOOD
// Components: PascalCase
export const SkateparkDetailScreen = () => {...}

// Hooks: camelCase starting with 'use'
export const useAuth = () => {...}

// Functions: camelCase
export function calculateDistance(lat1: number, lon1: number): number {...}

// Constants: UPPER_SNAKE_CASE
export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB

// Types/Interfaces: PascalCase
interface UserProfile {...}
type AuthState = {...}

// Files:
// - Components: PascalCase (SkateparkCard.tsx)
// - Hooks: camelCase (useAuth.ts)
// - Utils: camelCase (formatDistance.ts)
// - Types: camelCase (types.ts or skatepark.types.ts)
```

---

## Component Structure

### Component Organization
```typescript
// 1. Imports (grouped)
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SkateparkCard } from '@/components';
import { useAuth } from '@/hooks';
import { formatDistance } from '@/utils';

// 2. Types/Interfaces
interface Props {
  skateparkId: string;
  onPress?: () => void;
}

// 3. Constants (if any)
const MAX_DESCRIPTION_LENGTH = 200;

// 4. Component
export const SkateparkDetail: React.FC<Props> = ({ skateparkId, onPress }) => {
  // 4a. Hooks
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // 4b. Callbacks
  const handlePress = useCallback(() => {
    onPress?.();
  }, [onPress]);

  // 4c. Effects
  useEffect(() => {
    // Effect logic
  }, []);

  // 4d. Render helpers (if needed)
  const renderDescription = () => {...};

  // 4e. Return JSX
  return <View>...</View>;
};

// 5. Styles (if not using styled-components)
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

### Props Best Practices
```typescript
// ✅ GOOD: Destructured props with types
interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  disabled = false,
  variant = 'primary',
}) => {...}

// ❌ BAD: Untyped props object
export const Button = (props: any) => {
  return <TouchableOpacity onPress={props.onPress}>...</TouchableOpacity>;
};
```

---

## Error Handling

### Async Operations
```typescript
// ✅ GOOD: Comprehensive error handling
async function uploadMedia(file: File): Promise<MediaResult> {
  try {
    // Validate input
    if (!file || file.size === 0) {
      throw new Error('Invalid file');
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      throw new Error('File too large');
    }

    // Perform operation
    const { data, error } = await supabase.storage
      .from('media')
      .upload(`uploads/${file.name}`, file);

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    return { success: true, url: data.path };
  } catch (error) {
    // Log error (with analytics in production)
    if (__DEV__) {
      console.error('Upload error:', error);
    } else {
      Analytics.errorOccurred('media_upload_failed', error.message);
    }

    // Return user-friendly error
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

// ❌ BAD: Bare catch with no handling
async function uploadMedia(file: any) {
  try {
    const data = await supabase.storage.from('media').upload(file.name, file);
    return data;
  } catch (e) {
    console.log(e); // Bare console.log, no error handling
  }
}
```

### Never Use Bare Catch
```typescript
// ❌ NEVER DO THIS
try {
  something();
} catch {} // Silent failure

// ❌ NEVER DO THIS
try {
  something();
} catch (e) {
  // Empty catch
}

// ✅ ALWAYS HANDLE ERRORS
try {
  something();
} catch (error) {
  if (__DEV__) {
    console.error('Error:', error);
  }
  // Handle or rethrow
  throw new Error(`Operation failed: ${error.message}`);
}
```

---

## Testing Standards

### Unit Tests
```typescript
// Every public function/component should have tests
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from './Button';

describe('Button', () => {
  it('renders title correctly', () => {
    const { getByText } = render(<Button title="Click me" onPress={() => {}} />);
    expect(getByText('Click me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Click" onPress={onPress} />);
    fireEvent.press(getByText('Click'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    const { getByText } = render(
      <Button title="Click" onPress={() => {}} disabled />
    );
    const button = getByText('Click').parent;
    expect(button?.props.accessibilityState?.disabled).toBe(true);
  });
});
```

### Test Coverage Requirements
- **Minimum 70% coverage** for utils and hooks
- **All critical paths** must be tested
- **Mock external dependencies** (Supabase, navigation, etc.)
- Run tests: `npm test`
- Run with coverage: `npm run test:coverage`

---

## Security Best Practices

### Environment Variables
```typescript
// ✅ GOOD: Use EXPO_PUBLIC_ prefix for client-safe variables
const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

// ❌ NEVER commit .env files
// Add to .gitignore:
.env
.env.local
.env.production
```

### API Keys & Secrets
- **NEVER** hardcode API keys, tokens, or secrets
- Use `expo-constants` to access app config
- Store sensitive data in Expo Secrets (for EAS builds)
- Use Supabase Row Level Security (RLS) for data access control

### Input Validation
```typescript
// ✅ GOOD: Validate all user input
import * as yup from 'yup';

const skateparkSchema = yup.object({
  name: yup.string().required().min(3).max(100),
  description: yup.string().max(500),
  latitude: yup.number().required().min(-90).max(90),
  longitude: yup.number().required().min(-180).max(180),
});

// ❌ BAD: No validation
function addSkatepark(data: any) {
  supabase.from('skateparks').insert(data); // Vulnerable to injection
}
```

### Prevent XSS
```typescript
// ✅ GOOD: Sanitize user-generated content
import DOMPurify from 'isomorphic-dompurify';

const sanitizedContent = DOMPurify.sanitize(userContent);

// ❌ BAD: Rendering raw HTML
<WebView source={{ html: userContent }} />
```

---

## Version Control Standards

### Commit Messages
Follow Conventional Commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `style`: Code style changes (formatting, etc.)
- `test`: Adding or updating tests
- `docs`: Documentation changes
- `chore`: Maintenance tasks (dependencies, config, etc.)

**Examples:**
```
feat(auth): add biometric authentication support

Implement Face ID and Touch ID support for iOS and Android using
expo-local-authentication. Includes fallback to password authentication.

Closes #123
```

```
fix(map): prevent crash when location permission denied

Handle location permission denial gracefully by showing static map
centered on user's last known location or default coordinates.

Fixes #456
```

### Branch Naming
```
feature/ticket-number-short-description
fix/ticket-number-short-description
refactor/component-name
hotfix/critical-issue
```

Examples:
- `feature/sk-123-add-video-upload`
- `fix/sk-456-map-crash`
- `refactor/analytics-module`

### Pre-Commit Checks
```json
// .husky/pre-commit (already configured)
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

**Required before commit:**
- ✅ Code formatted with Prettier
- ✅ No ESLint errors
- ✅ TypeScript type checking passes
- ✅ Tests pass
- ✅ No console.log statements in production code

---

## Code Review Checklist

Before submitting a PR, verify:

- [ ] All code is properly typed (no `any` unless absolutely necessary)
- [ ] Components are memoized where appropriate
- [ ] FlatList used instead of ScrollView for lists
- [ ] Images have proper dimensions and caching
- [ ] Error handling is comprehensive
- [ ] No hardcoded values (use constants or config)
- [ ] No commented-out code
- [ ] No console.log in production code (use `if (__DEV__)` guard)
- [ ] Meaningful variable and function names
- [ ] Tests written and passing
- [ ] No new ESLint warnings
- [ ] TypeScript compiles without errors
- [ ] No security vulnerabilities introduced
- [ ] Performance impact considered and documented

---

## Performance Monitoring

### React Native Performance
```typescript
// Use Profiler for performance critical components
import { Profiler } from 'react';

<Profiler
  id="SkateparkList"
  onRender={(id, phase, actualDuration) => {
    if (__DEV__ && actualDuration > 16) {
      console.warn(`${id} took ${actualDuration}ms to render`);
    }
  }}
>
  <SkateparkList />
</Profiler>
```

### Bundle Size Analysis
```bash
npm run analyze:bundle
```

Monitor bundle size and lazy load heavy dependencies when possible.

---

## Accessibility

### Always Include Accessibility Props
```typescript
// ✅ GOOD: Proper accessibility
<TouchableOpacity
  accessible={true}
  accessibilityLabel="Add skatepark to favorites"
  accessibilityRole="button"
  accessibilityState={{ disabled: loading }}
  onPress={handlePress}
>
  <Text>Favorite</Text>
</TouchableOpacity>

// ❌ BAD: No accessibility
<TouchableOpacity onPress={handlePress}>
  <Text>Favorite</Text>
</TouchableOpacity>
```

### Test with Screen Readers
- Test on iOS VoiceOver
- Test on Android TalkBack
- Ensure all interactive elements are reachable

---

## Documentation Standards

### Function Documentation
```typescript
/**
 * Calculates the distance between two geographic coordinates using the Haversine formula.
 *
 * @param lat1 - Latitude of the first point in decimal degrees
 * @param lon1 - Longitude of the first point in decimal degrees
 * @param lat2 - Latitude of the second point in decimal degrees
 * @param lon2 - Longitude of the second point in decimal degrees
 * @returns Distance in kilometers
 *
 * @example
 * ```typescript
 * const distance = calculateDistance(37.7749, -122.4194, 34.0522, -118.2437);
 * console.log(`Distance: ${distance.toFixed(2)} km`);
 * ```
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // Implementation
}
```

### Component Documentation
```typescript
/**
 * SkateparkCard displays a skatepark's basic information in a card format.
 *
 * @component
 * @example
 * ```tsx
 * <SkateparkCard
 *   skatepark={skateparkData}
 *   onPress={() => navigation.navigate('SkateparkDetail', { id: skateparkData.id })}
 * />
 * ```
 */
interface SkateparkCardProps {
  /** Skatepark data object */
  skatepark: Skatepark;
  /** Callback fired when card is pressed */
  onPress?: () => void;
}
```

---

## Prohibited Practices

### ❌ NEVER
- Use `any` type without explicit justification
- Commit commented-out code
- Leave `console.log` in production code (use `if (__DEV__)` guard)
- Hardcode API keys or secrets
- Use bare `catch` blocks
- Use wildcard imports (`import * as`)
- Disable ESLint rules without justification
- Commit merge conflicts
- Push to `main` branch directly
- Skip tests for critical functionality
- Use `var` (use `const` or `let`)
- Mutate props
- Use inline styles for complex styling
- Ignore TypeScript errors
- Use deprecated APIs

---

## Recommended VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "expo.vscode-expo-tools",
    "bradlc.vscode-tailwindcss",
    "streetsidesoftware.code-spell-checker"
  ]
}
```

---

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Performance](https://reactnative.dev/docs/performance)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [React Navigation](https://reactnavigation.org/docs/getting-started)
- [Supabase Docs](https://supabase.com/docs)

---

**This guide is a living document. Suggestions for improvements should be submitted via PR with detailed justification.**

**Last Updated:** January 21, 2026 by Claude Code Agent
