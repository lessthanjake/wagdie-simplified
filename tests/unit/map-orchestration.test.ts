import type { MapLocationData, MarkerPayload } from '@/game/EventBus';

jest.mock('@/lib/utils/blockchain', () => ({
  isBurnedOwner: jest.fn(() => false),
}));

import { getStakingLocationSelection } from '@/lib/utils/mapOrchestration';

function locationMarker(overrides: Partial<MapLocationData> = {}): MarkerPayload {
  return {
    id: 'concord_searing',
    type: 'location',
    name: 'Concord Searing',
    x: 0,
    y: 0,
    data: {
      id: 'concord_searing',
      name: 'Concord Searing',
      description: 'A place of power',
      metadata: { center: [10, 20], bounds: [[0, 0], [100, 100]] },
      ...overrides,
    },
  };
}

describe('getStakingLocationSelection', () => {
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

  beforeEach(() => {
    warnSpy.mockClear();
  });

  afterAll(() => {
    warnSpy.mockRestore();
  });

  it('uses location.chain_location_id as the contract staking location ID', () => {
    const selection = getStakingLocationSelection(locationMarker({ chain_location_id: '7' }));

    expect(selection).toEqual({
      selectedLocation: {
        location: expect.objectContaining({
          id: 'concord_searing',
          chain_location_id: '7',
        }),
        locationId: 7n,
      },
      selectedLocationError: null,
    });
  });

  it('rejects a slug DB id when chain_location_id is missing', () => {
    const selection = getStakingLocationSelection(locationMarker());

    expect(selection).toEqual({
      selectedLocation: null,
      selectedLocationError: 'This location is not registered on-chain. Staking is unavailable.',
    });
    expect(warnSpy).toHaveBeenCalledWith('Location "concord_searing" has no valid chain_location_id');
  });

  it('rejects zero chain_location_id values', () => {
    const selection = getStakingLocationSelection(locationMarker({ chain_location_id: '0' }));

    expect(selection).toEqual({
      selectedLocation: null,
      selectedLocationError: 'This location is not registered on-chain. Staking is unavailable.',
    });
  });

  it('rejects non-numeric chain_location_id values', () => {
    const selection = getStakingLocationSelection(locationMarker({ chain_location_id: 'concord_searing' }));

    expect(selection).toEqual({
      selectedLocation: null,
      selectedLocationError: 'This location is not registered on-chain. Staking is unavailable.',
    });
  });
});
