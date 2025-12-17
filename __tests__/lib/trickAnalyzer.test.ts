import { analyzeTrickVideo, saveAnalysisResult, TrickAnalysisResult } from '../../lib/trickAnalyzer';
import { supabase } from '../../lib/supabase';
import * as FileSystem from 'expo-file-system';

jest.mock('expo-file-system');

describe('TrickAnalyzer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeTrickVideo', () => {
    it('analyzes video and returns trick analysis', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 1024000,
      });

      const result = await analyzeTrickVideo('file:///path/to/kickflip.mp4');

      expect(result).toHaveProperty('trickName');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('difficulty');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('feedback');
      expect(result).toHaveProperty('detectedElements');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('detects trick from filename', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
      });

      const result = await analyzeTrickVideo('file:///path/to/kickflip-attempt.mp4');
      expect(result.trickName).toBe('Kickflip');
    });

    it('handles errors gracefully', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockRejectedValue(new Error('File not found'));

      await expect(analyzeTrickVideo('invalid-path')).rejects.toThrow();
    });
  });

  describe('saveAnalysisResult', () => {
    it('saves analysis to database', async () => {
      const analysis: TrickAnalysisResult = {
        trickName: 'Kickflip',
        confidence: 0.85,
        difficulty: 'Intermediate',
        score: 82,
        feedback: 'Great job!',
        detectedElements: ['Good rotation', 'Clean landing'],
      };

      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ data: {}, error: null });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      });

      await saveAnalysisResult('media-123', analysis);

      expect(supabase.from).toHaveBeenCalledWith('media');
      expect(mockUpdate).toHaveBeenCalledWith({
        trick_name: 'Kickflip',
      });
      expect(mockEq).toHaveBeenCalledWith('id', 'media-123');
    });
  });
});
