/// <reference path="../../types/testEnvShims.d.ts" />
import {
  analyzeTrick,
  analyzeTrickVideo,
  saveAnalysisResult,
  getFallbackAnalysis,
  TrickAnalysis,
} from '../../lib/trickAnalyzer';
import { supabase } from '../../lib/supabase';

const mockFrom = supabase.from as unknown as { mockReturnValue: (...args: any[]) => any };

describe('trickAnalyzer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('analyzeTrick / analyzeTrickVideo', () => {
    const mockAnalysis: TrickAnalysis = {
      difficulty: 'Intermediate',
      tips: ['Snap harder'],
      common_mistakes: ['Catching early'],
      prerequisites: ['Ollie'],
      xp_value: 75,
      style_notes: 'Looking solid',
    };

    it('POSTs to the analyze-trick edge function with the trick name, description, and video URL', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockAnalysis,
      });

      const result = await analyzeTrick('Kickflip', 'Landed clean', 'file:///video.mp4');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/analyze-trick'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-token',
          }),
          body: JSON.stringify({
            trick_name: 'Kickflip',
            description: 'Landed clean',
            video_url: 'file:///video.mp4',
          }),
        })
      );
      expect(result).toEqual(mockAnalysis);
    });

    it('is exported as analyzeTrickVideo for backward compatibility', () => {
      expect(analyzeTrickVideo).toBe(analyzeTrick);
    });

    it('throws when the edge function responds with a non-ok status', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });

      await expect(analyzeTrick('Kickflip')).rejects.toThrow('Trick analysis failed: 500');
    });
  });

  describe('saveAnalysisResult', () => {
    it('inserts the analysis into trick_analyses with the given user, trick name, and video URL', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValue({ insert: mockInsert });

      const analysis: TrickAnalysis = {
        difficulty: 'Advanced',
        tips: [],
        common_mistakes: [],
        prerequisites: [],
        xp_value: 100,
        style_notes: 'Clean execution',
      };

      await saveAnalysisResult('user-123', 'Tre Flip', analysis, 'file:///video.mp4');

      expect(mockFrom).toHaveBeenCalledWith('trick_analyses');
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-123',
        trick_name: 'Tre Flip',
        difficulty: 'Advanced',
        xp_value: 100,
        style_notes: 'Clean execution',
        video_url: 'file:///video.mp4',
      });
    });

    it('throws when the insert fails', async () => {
      const mockError = { message: 'insert failed' };
      const mockInsert = jest.fn().mockResolvedValue({ error: mockError });
      mockFrom.mockReturnValue({ insert: mockInsert });

      await expect(
        saveAnalysisResult('user-123', 'Tre Flip', {
          difficulty: 'Advanced',
          tips: [],
          common_mistakes: [],
          prerequisites: [],
          xp_value: 100,
          style_notes: '',
        })
      ).rejects.toEqual(mockError);
    });
  });

  describe('getFallbackAnalysis', () => {
    it('returns a usable generic analysis referencing the trick name', () => {
      const result = getFallbackAnalysis('Kickflip');

      expect(result.trickName).toBe('Kickflip');
      expect(result.difficulty).toBe('Intermediate');
      expect(result.style_notes).toContain('Kickflip');
      expect(result.tips.length).toBeGreaterThan(0);
    });
  });
});
