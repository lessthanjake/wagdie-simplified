import { act, renderHook } from '@testing-library/react';

import { useMapStakingPanel, type SelectedStakingLocation } from '@/hooks/map/useMapStakingPanel';
import { STAKING_CHAIN_ERROR } from '@/lib/contracts/staking-chain';
import type { Location } from '@/lib/types/map';

jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useChainId: jest.fn(),
}));

jest.mock('@/hooks/useOwnedCharacters', () => ({
  useOwnedCharacters: jest.fn(),
}));

jest.mock('@/hooks/useStakingStatuses', () => ({
  useStakingStatuses: jest.fn(),
}));

jest.mock('@/hooks/useStaking', () => ({
  useStaking: jest.fn(),
}));

const wagmi = jest.requireMock('wagmi') as {
  useAccount: jest.Mock;
  useChainId: jest.Mock;
};
const useOwnedCharactersMock = jest.requireMock('@/hooks/useOwnedCharacters').useOwnedCharacters as jest.Mock;
const useStakingStatusesMock = jest.requireMock('@/hooks/useStakingStatuses').useStakingStatuses as jest.Mock;
const useStakingMock = jest.requireMock('@/hooks/useStaking').useStaking as jest.Mock;

const address = '0x0000000000000000000000000000000000000001';
const refetchCharacters = jest.fn();
const refetchStatuses = jest.fn();
const checkApproval = jest.fn();
const stakeWagdie = jest.fn();
const unstakeWagdie = jest.fn();
const syncStakingState = jest.fn();

function selectedLocation(): SelectedStakingLocation {
  return {
    location: {
      id: 'concord_searing',
      name: 'Concord Searing',
      chain_location_id: '7',
      metadata: {
        bounds: [[0, 0], [1, 1]],
      },
      created_at: '2026-05-06T00:00:00.000Z',
      updated_at: '2026-05-06T00:00:00.000Z',
    } satisfies Location,
    locationId: 7n,
  };
}

function renderPanel(overrides: Partial<Parameters<typeof useMapStakingPanel>[0]> = {}) {
  return renderHook(() => useMapStakingPanel({
    isOpen: true,
    selectedLocation: selectedLocation(),
    selectedMarker: null,
    stakedHere: [],
    walletAddress: address,
    ...overrides,
  }));
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();

  wagmi.useAccount.mockReturnValue({ address, isConnected: true });
  wagmi.useChainId.mockReturnValue(1);

  refetchCharacters.mockResolvedValue(undefined);
  refetchStatuses.mockResolvedValue(undefined);
  checkApproval.mockResolvedValue(true);
  stakeWagdie.mockResolvedValue({
    transaction: { success: true, txId: 'stake-tx' },
    sync: { ok: true, retryable: false },
  });
  unstakeWagdie.mockResolvedValue({
    transaction: { success: true, txId: 'unstake-tx' },
    sync: { ok: true, retryable: false },
  });
  syncStakingState.mockResolvedValue({ ok: true, retryable: false });

  useOwnedCharactersMock.mockReturnValue({
    characters: [{ token_id: 7, name: 'Wagdie #7' }],
    isLoading: false,
    error: null,
    refetch: refetchCharacters,
  });

  useStakingStatusesMock.mockReturnValue({
    statuses: new Map(),
    isLoading: false,
    error: null,
    refetch: refetchStatuses,
  });

  useStakingMock.mockReturnValue({
    isStaking: false,
    isUnstaking: false,
    isApproving: false,
    error: null,
    checkApproval,
    approveForStaking: jest.fn().mockResolvedValue(undefined),
    stakeWagdie,
    unstakeWagdie,
    syncStakingState,
  });
});

describe('useMapStakingPanel', () => {
  it('gates unstake and approval UI on the wrong chain', () => {
    wagmi.useChainId.mockReturnValue(11155111);

    const { result } = renderPanel();

    expect(result.current.isCorrectChain).toBe(false);
    expect(result.current.chainError).toBe(STAKING_CHAIN_ERROR);
    expect(result.current.canUnstakeNow).toBe(false);
    expect(result.current.showApprovalBanner).toBe(false);
    expect(checkApproval).not.toHaveBeenCalled();
  });

  it('surfaces sync failure, refreshes chain status, and clears after one retry succeeds', async () => {
    jest.useFakeTimers();
    const onStakingChanged = jest.fn().mockResolvedValue(undefined);

    stakeWagdie.mockResolvedValueOnce({
      transaction: { success: true, txId: 'stake-tx' },
      sync: {
        ok: false,
        message: 'Failed to sync staking state for #7: No location mapping',
        retryable: true,
      },
    });
    syncStakingState.mockResolvedValueOnce({ ok: true, retryable: false });

    const { result } = renderPanel({ onStakingChanged });

    await act(async () => {
      await result.current.handleStake(7);
    });

    expect(result.current.syncWarning).toBe('Failed to sync staking state for #7: No location mapping');
    expect(result.current.pendingSyncTokenIds.has(7)).toBe(true);
    expect(refetchStatuses).toHaveBeenCalledWith({ source: 'chain', tokenIds: [7] });
    expect(refetchCharacters).toHaveBeenCalledTimes(1);
    expect(onStakingChanged).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(5_000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(syncStakingState).toHaveBeenCalledWith(7, 'stake');
    expect(result.current.syncWarning).toBeNull();
    expect(result.current.pendingSyncTokenIds.has(7)).toBe(false);
    expect(refetchStatuses).toHaveBeenCalledWith();
    expect(refetchCharacters).toHaveBeenCalledTimes(2);
    expect(onStakingChanged).toHaveBeenCalledTimes(2);
  });

  it('clears pending sync state when a superseding token operation starts', async () => {
    stakeWagdie
      .mockResolvedValueOnce({
        transaction: { success: true, txId: 'first-stake-tx' },
        sync: {
          ok: false,
          message: 'Failed to sync staking state for #7: No location mapping',
          retryable: false,
        },
      })
      .mockResolvedValueOnce({
        transaction: { success: true, txId: 'second-stake-tx' },
        sync: { ok: true, retryable: false },
      });

    const { result } = renderPanel();

    await act(async () => {
      await result.current.handleStake(7);
    });

    expect(result.current.pendingSyncTokenIds.has(7)).toBe(true);

    await act(async () => {
      await result.current.handleStake(7);
    });

    expect(result.current.pendingSyncTokenIds.has(7)).toBe(false);
    expect(result.current.syncWarning).toBeNull();
  });
});
