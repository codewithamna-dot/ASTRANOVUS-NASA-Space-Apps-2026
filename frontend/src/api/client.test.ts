import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMissionRecommend } from './client';

afterEach(() => vi.unstubAllGlobals());

describe('fetchMissionRecommend', () => {
  it('sends only non-default weight factors and the target', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      calls.push(url);
      return { ok: true, json: async () => ({}) } as Response;
    });
    await fetchMissionRecommend({ experiment: 'MARS_GEOLOGY_SAMPLING', target: 'MARS_JEZERO', weights: { D1_cold: 1, D8_thermal_swing: 2.5, D2_aridity: 0 } });
    const u = new URL(calls[0], 'http://x');
    expect(u.searchParams.get('experiment')).toBe('MARS_GEOLOGY_SAMPLING');
    expect(u.searchParams.get('target')).toBe('MARS_JEZERO');
    expect(u.searchParams.get('weights')).toBe('D8_thermal_swing:2.5,D2_aridity:0');
  });

  it('turns a network failure into a readable error', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('failed');
    });
    await expect(fetchMissionRecommend({ experiment: 'X' })).rejects.toThrow(/Cannot reach the ASTRANOVUS API/);
  });

  it('surfaces the API detail message', async () => {
    vi.stubGlobal('fetch', async () => ({ ok: false, status: 422, json: async () => ({ detail: 'bad target' }) }) as Response);
    await expect(fetchMissionRecommend({ experiment: 'X' })).rejects.toThrow('bad target');
  });
});
