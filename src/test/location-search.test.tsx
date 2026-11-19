import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CityAutocomplete from '@/components/CityAutocomplete';
import { geocode, searchPlaces } from '@/lib/routing';

vi.mock('@/lib/routing', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/routing')>();
  return { ...actual, searchPlaces: vi.fn() };
});

const mockedSearch = vi.mocked(searchPlaces);

describe('All-India location search', () => {
  beforeEach(() => {
    mockedSearch.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it.each([
    ['Delhi', 'Delhi, India', 28.6139, 77.209],
    ['Bhopal', 'Bhopal, Madhya Pradesh, India', 23.2599, 77.4126],
    ['Banaras', 'Varanasi, Uttar Pradesh, India', 25.3176, 82.9739],
  ])('finds %s outside the saved Maharashtra dropdown and returns its coordinates', async (query, label, lat, lng) => {
    mockedSearch.mockResolvedValue([{ label, lat, lng }]);
    const onChange = vi.fn();
    render(<CityAutocomplete label="Pickup location" value="" onChange={onChange} />);

    const input = screen.getByRole('combobox', { name: 'Pickup location' });
    fireEvent.change(input, { target: { value: query } });
    fireEvent.keyDown(input, { key: 'Enter' });
    const result = await screen.findByText(label);
    fireEvent.click(result.closest('button') as HTMLButtonElement);

    expect(mockedSearch).toHaveBeenCalledWith(query);
    expect(onChange).toHaveBeenLastCalledWith(label, expect.objectContaining({ lat, lng }));
  });

  it('geocodes Delhi across India without forcing Maharashtra into the request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '28.6139', lon: '77.2090' }],
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(geocode('Delhi')).resolves.toEqual({ lat: 28.6139, lng: 77.209 });
    const url = String(fetchMock.mock.calls[0]?.[0] ?? '');
    expect(url).toContain('countrycodes=in');
    expect(url).toContain('q=Delhi');
    expect(url).not.toContain('Maharashtra');
  });
});
