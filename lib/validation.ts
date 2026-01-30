import * as yup from 'yup';
import sanitizeHtmlLib from 'sanitize-html';

/**
 * Input validation schemas using Yup
 * Prevents invalid data and security issues
 */

// User authentication schemas

export const signupSchema = yup.object().shape({
  username: yup
    .string()
    .required('Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must not exceed 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: yup.string().required('Email is required').email('Please enter a valid email'),
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
});

export const loginSchema = yup.object().shape({
  email: yup.string().required('Email is required').email('Please enter a valid email'),
  password: yup.string().required('Password is required'),
});

export const resetPasswordSchema = yup.object().shape({
  email: yup.string().required('Email is required').email('Please enter a valid email'),
});

// Profile schemas

export const updateProfileSchema = yup.object().shape({
  username: yup
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must not exceed 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  bio: yup.string().max(500, 'Bio must not exceed 500 characters'),
  level: yup.string().oneOf(['Beginner', 'Intermediate', 'Advanced', 'Pro'], 'Invalid skill level'),
});

// Skatepark schemas

export const addSkateparkSchema = yup.object().shape({
  name: yup
    .string()
    .required('Skatepark name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters'),
  description: yup.string().max(1000, 'Description must not exceed 1000 characters'),
  latitude: yup
    .number()
    .required('Location is required')
    .min(-90, 'Invalid latitude')
    .max(90, 'Invalid latitude'),
  longitude: yup
    .number()
    .required('Location is required')
    .min(-180, 'Invalid longitude')
    .max(180, 'Invalid longitude'),
  address: yup.string().max(200, 'Address must not exceed 200 characters'),
});

export const rateSkateparkSchema = yup.object().shape({
  rating: yup
    .number()
    .required('Rating is required')
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5'),
  review: yup.string().max(500, 'Review must not exceed 500 characters'),
});

// Media schemas

export const uploadMediaSchema = yup.object().shape({
  title: yup.string().max(100, 'Title must not exceed 100 characters'),
  description: yup.string().max(500, 'Description must not exceed 500 characters'),
  trick_name: yup.string().max(50, 'Trick name must not exceed 50 characters'),
});

// Comment schema

export const commentSchema = yup.object().shape({
  content: yup
    .string()
    .required('Comment cannot be empty')
    .min(1, 'Comment cannot be empty')
    .max(500, 'Comment must not exceed 500 characters'),
});

// Search schema

export const searchSchema = yup.object().shape({
  query: yup
    .string()
    .required('Search query cannot be empty')
    .min(1, 'Search query cannot be empty')
    .max(100, 'Search query must not exceed 100 characters'),
});

/**
 * Validate data against a schema
 */
export async function validate<T>(
  schema: yup.Schema,
  data: any
): Promise<{ valid: boolean; data?: T; errors?: Record<string, string> }> {
  try {
    const validated = await schema.validate(data, { abortEarly: false });
    return { valid: true, data: validated };
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      const errors: Record<string, string> = {};
      error.inner.forEach(err => {
        if (err.path) {
          errors[err.path] = err.message;
        }
      });
      return { valid: false, errors };
    }
    return { valid: false, errors: { _general: 'Validation failed' } };
  }
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Sanitize HTML content
 */
export function sanitizeHtml(html: string): string {
  if (typeof html !== 'string') {
    return '';
  }

  // Use a robust HTML sanitizer to remove potentially dangerous content
  const sanitized = sanitizeHtmlLib(html);
  return sanitized.trim();
}

/**
 * Validate file size
 */
export function validateFileSize(
  sizeBytes: number,
  maxSizeMB: number
): { valid: boolean; error?: string } {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (sizeBytes > maxSizeBytes) {
    return {
      valid: false,
      error: `File size must not exceed ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Validate file type
 */
export function validateFileType(
  mimeType: string,
  allowedTypes: string[]
): { valid: boolean; error?: string } {
  if (!allowedTypes.includes(mimeType)) {
    return {
      valid: false,
      error: `File type must be one of: ${allowedTypes.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Validate image file
 */
export function validateImage(file: { mimeType: string; size: number }): {
  valid: boolean;
  error?: string;
} {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 10; // 10MB

  const typeCheck = validateFileType(file.mimeType, allowedTypes);
  if (!typeCheck.valid) {
    return typeCheck;
  }

  const sizeCheck = validateFileSize(file.size, maxSize);
  if (!sizeCheck.valid) {
    return sizeCheck;
  }

  return { valid: true };
}

/**
 * Validate video file
 */
export function validateVideo(file: { mimeType: string; size: number }): {
  valid: boolean;
  error?: string;
} {
  const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
  const maxSize = 100; // 100MB

  const typeCheck = validateFileType(file.mimeType, allowedTypes);
  if (!typeCheck.valid) {
    return typeCheck;
  }

  const sizeCheck = validateFileSize(file.size, maxSize);
  if (!sizeCheck.valid) {
    return sizeCheck;
  }

  return { valid: true };
}

export default {
  signupSchema,
  loginSchema,
  resetPasswordSchema,
  updateProfileSchema,
  addSkateparkSchema,
  rateSkateparkSchema,
  uploadMediaSchema,
  commentSchema,
  searchSchema,
  validate,
  sanitizeInput,
  sanitizeHtml,
  validateFileSize,
  validateFileType,
  validateImage,
  validateVideo,
};
