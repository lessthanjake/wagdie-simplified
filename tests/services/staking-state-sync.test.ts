/**
 * @jest-environment node
 */

const mockMulticall = jest.fn();
const mockGetSupabaseAdmin = jest.fn();

jest.mock('viem', () => ({
  createPublicClient: jest.fn(() => ({ multicall: (...args: unknown[]) => mockMulticall(...args) })),
  fallback: jest.fn((transports) => ({ transports })),
  http: jest.fn((url) => ({ url })),
}));

jest.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: (...args: unknown[]) => mockGetSupabaseAdmin(...args),
}));

import { syncStakingState } from '@/lib/services/sync/staking-state-sync';

type LocationFixture = {
  id: string;
  chain_location_id: string | null;
  metadata: unknown;
};

type UpdateCall = {
  table: string;
  values: Record<string, unknown>;
  column: string;
  value: number;
};

function createAdminClient(
  locationRows: LocationFixture[],
  options: { existingTokenIds?: number[] } = {}
) {
  const updates: UpdateCall[] = [];
  const existingTokenIds = new Set(options.existingTokenIds ?? []);
  const shouldTreatAllTokenIdsAsExisting = !options.existingTokenIds;
  const locationSelect = jest.fn().mockResolvedValue({ data: locationRows, error: null });
  const from = jest.fn((table: string) => {
    if (table === 'locations') {
      return { select: locationSelect };
    }

    return {
      update: jest.fn((values: Record<string, unknown>) => ({
        eq: jest.fn((column: string, value: number) => ({
          select: jest.fn(async () => {
            updates.push({ table, values, column, value });
            return {
              data: shouldTreatAllTokenIdsAsExisting || existingTokenIds.has(value)
                ? [{ token_id: value }]
                : [],
              error: null,
            };
          }),
        })),
      })),
    };
  });

  return { client: { from }, locationSelect, updates };
}

function mockChainInfo(tokenId: number, locationIdCur: bigint, owner = '0xABCDEF0000000000000000000000000000000001') {
  mockMulticall.mockResolvedValueOnce([
    {
      status: 'success',
      result: {
        locationIdCur,
        owner,
        emptySpace: 0,
      },
    },
  ]);

  return tokenId;
}

describe('syncStakingState location mapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSupabaseAdmin.mockReset();
    mockMulticall.mockReset();
  });

  it('maps chain locationIdCur to DB locations.id through chain_location_id', async () => {
    const admin = createAdminClient([
      { id: 'concord_searing', chain_location_id: '7', metadata: null },
    ]);
    mockGetSupabaseAdmin.mockReturnValue(admin.client);
    mockChainInfo(101, 7n);

    const response = await syncStakingState({ tokenIds: [101] });

    expect(response.results).toEqual([
      {
        tokenId: 101,
        success: true,
        chainLocationId: '7',
        stakerAddress: '0xabcdef0000000000000000000000000000000001',
        locationId: 'concord_searing',
      },
    ]);
    expect(admin.locationSelect).toHaveBeenCalledWith('id, chain_location_id, metadata');
    expect(admin.updates).toEqual([
      expect.objectContaining({
        table: 'wagdie_characters',
        column: 'token_id',
        value: 101,
        values: expect.objectContaining({
          location_id: 'concord_searing',
          staker_address: '0xabcdef0000000000000000000000000000000001',
          staking_status: 'staked',
        }),
      }),
    ]);
  });

  it('clears DB staking fields and marks unstaked when chain locationIdCur is zero', async () => {
    const admin = createAdminClient([]);
    mockGetSupabaseAdmin.mockReturnValue(admin.client);
    mockChainInfo(102, 0n);

    const response = await syncStakingState({ tokenIds: [102] });

    expect(response.results).toEqual([
      {
        tokenId: 102,
        success: true,
        chainLocationId: '0',
        stakerAddress: '0xabcdef0000000000000000000000000000000001',
        locationId: null,
      },
    ]);
    expect(admin.locationSelect).not.toHaveBeenCalled();
    expect(admin.updates).toEqual([
      expect.objectContaining({
        values: expect.objectContaining({
          location_id: null,
          staker_address: null,
          staking_status: 'unstaked',
        }),
      }),
    ]);
  });

  it('falls back to metadata.chain_location_id when the column is not populated', async () => {
    const admin = createAdminClient([
      { id: 'forsaken_lands', chain_location_id: null, metadata: { chain_location_id: '8' } },
    ]);
    mockGetSupabaseAdmin.mockReturnValue(admin.client);
    mockChainInfo(103, 8n);

    const response = await syncStakingState({ tokenIds: [103] });

    expect(response.results[0]).toMatchObject({
      tokenId: 103,
      success: true,
      chainLocationId: '8',
      locationId: 'forsaken_lands',
    });
    expect(admin.updates[0].values).toEqual(expect.objectContaining({
      location_id: 'forsaken_lands',
      staking_status: 'staked',
    }));
  });

  it('fails a staked token without writing when no DB mapping exists', async () => {
    const admin = createAdminClient([
      { id: 'forsaken_lands', chain_location_id: '8', metadata: null },
    ]);
    mockGetSupabaseAdmin.mockReturnValue(admin.client);
    mockChainInfo(104, 7n);

    const response = await syncStakingState({ tokenIds: [104] });

    expect(response.results).toEqual([
      {
        tokenId: 104,
        success: false,
        chainLocationId: '7',
        stakerAddress: '0xabcdef0000000000000000000000000000000001',
        locationId: null,
        error: 'No location mapping for chain_location_id',
      },
    ]);
    expect(admin.updates).toEqual([]);
  });

  it('fails a token when the DB update matches no character row', async () => {
    const admin = createAdminClient(
      [{ id: 'concord_searing', chain_location_id: '7', metadata: null }],
      { existingTokenIds: [] }
    );
    mockGetSupabaseAdmin.mockReturnValue(admin.client);
    mockChainInfo(106, 7n);

    const response = await syncStakingState({ tokenIds: [106] });

    expect(response.results).toEqual([
      {
        tokenId: 106,
        success: false,
        chainLocationId: '7',
        stakerAddress: '0xabcdef0000000000000000000000000000000001',
        locationId: 'concord_searing',
        error: 'Character row not found for token_id 106',
      },
    ]);
    expect(admin.updates).toHaveLength(1);
  });

  it('fails an ambiguous staked token without writing when chain IDs are duplicated', async () => {
    const admin = createAdminClient([
      { id: 'concord_searing', chain_location_id: '7', metadata: null },
      { id: 'duplicate_searing', chain_location_id: '7', metadata: null },
    ]);
    mockGetSupabaseAdmin.mockReturnValue(admin.client);
    mockChainInfo(105, 7n);

    const response = await syncStakingState({ tokenIds: [105] });

    expect(response.results).toEqual([
      {
        tokenId: 105,
        success: false,
        chainLocationId: '7',
        stakerAddress: '0xabcdef0000000000000000000000000000000001',
        locationId: null,
        error: 'Duplicate location mapping for chain_location_id',
      },
    ]);
    expect(admin.updates).toEqual([]);
  });
});
