import { fireEvent, render, screen } from '@testing-library/react';
import { ApprovalBanner, ApprovalReadyBanner } from '@/components/map/staking-sidebar/ApprovalBanner';
import { LocationTabs } from '@/components/map/staking-sidebar/LocationTabs';
import { PaginationControls } from '@/components/map/staking-sidebar/PaginationControls';
import { WalletGate } from '@/components/map/staking-sidebar/WalletGate';
import { CharacterStakeList } from '@/components/map/staking-sidebar/CharacterStakeList';
import { StakedHereList } from '@/components/map/staking-sidebar/StakedHereList';
import type { StakableCharacter } from '@/hooks/map/useMapStakingPanel';

describe('staking-sidebar presentational components', () => {
  it('renders wallet gate copy', () => {
    render(<WalletGate />);

    expect(screen.getByText('Wallet not connected')).toBeInTheDocument();
    expect(screen.getByText('Connect to view and stake your characters')).toBeInTheDocument();
  });

  it('switches location tabs and shows counts', () => {
    const setActiveTab = jest.fn();

    render(
      <LocationTabs
        activeTab="your-characters"
        setActiveTab={setActiveTab}
        stakedCount={3}
        totalCharacters={12}
        isConnected
      />
    );

    expect(screen.getByRole('button', { name: /Staked Here\s*3/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Your Characters\s*12/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Staked Here/i }));

    expect(setActiveTab).toHaveBeenCalledWith('staked-here');
  });

  it('updates pagination with functional page setters and honors disabled states', () => {
    const setPage = jest.fn();

    render(
      <PaginationControls
        page={1}
        totalPages={3}
        startIndex={10}
        endIndex={20}
        totalCharacters={25}
        isLoadingStatuses={false}
        setPage={setPage}
      />
    );

    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 11-20 of 25');
    expect(screen.getByText('2 / 3')).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);

    expect(setPage).toHaveBeenCalledTimes(2);
    expect(setPage.mock.calls[0][0](1)).toBe(0);
    expect(setPage.mock.calls[1][0](1)).toBe(2);
  });

  it('hides pagination when only one page is available', () => {
    const { container } = render(
      <PaginationControls
        page={0}
        totalPages={1}
        startIndex={0}
        endIndex={5}
        totalCharacters={5}
        isLoadingStatuses={false}
        setPage={jest.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders approval states and calls approve action when enabled', () => {
    const handleApprove = jest.fn().mockResolvedValue(undefined);

    render(
      <ApprovalBanner
        approvalState="not_approved"
        approvalError={null}
        isApproving={false}
        handleApprove={handleApprove}
      />
    );

    expect(screen.getByText('Contract approval required')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    expect(handleApprove).toHaveBeenCalledTimes(1);
  });

  it('renders approval success and error states', () => {
    const { rerender } = render(<ApprovalReadyBanner />);
    expect(screen.getByText('Ready to stake')).toBeInTheDocument();

    rerender(
      <ApprovalBanner
        approvalState="error"
        approvalError="Approval check timed out"
        isApproving={false}
        handleApprove={jest.fn()}
      />
    );

    expect(screen.getByText('Approval check failed')).toBeInTheDocument();
    expect(screen.getByText('Approval check timed out')).toBeInTheDocument();
  });

  it('disables owned-character unstake actions when canUnstakeNow is false', () => {
    const character: StakableCharacter = {
      token_id: 7,
      name: 'Wagdie #7',
      image_url: '/images/placeholder-character.svg',
      isStaked: true,
    };

    render(
      <CharacterStakeList
        allCharacters={[character]}
        activeTokenId={null}
        isStaking={false}
        isUnstaking={false}
        isLoadingStatuses={false}
        canStakeNow
        canUnstakeNow={false}
        handleStake={jest.fn()}
        handleUnstake={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Unstake' })).toBeDisabled();
  });

  it('disables staked-here unstake actions when canUnstakeNow is false', () => {
    render(
      <StakedHereList
        stakedHere={[
          {
            token_id: 7,
            name: 'Wagdie #7',
            image_url: '/images/placeholder-character.svg',
            owner_address: '0xabc',
            staker_address: '0xabc',
          } as any,
        ]}
        effectiveWallet="0xabc"
        activeTokenId={null}
        isUnstaking={false}
        isLoadingStatuses={false}
        canUnstakeNow={false}
        handleUnstake={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Unstake' })).toBeDisabled();
  });

  it('disables matching owned-character stake and unstake actions while sync is pending', () => {
    const unstakedCharacter: StakableCharacter = {
      token_id: 7,
      name: 'Wagdie #7',
      image_url: '/images/placeholder-character.svg',
      isStaked: false,
    };
    const stakedCharacter: StakableCharacter = {
      token_id: 8,
      name: 'Wagdie #8',
      image_url: '/images/placeholder-character.svg',
      isStaked: true,
    };

    const { rerender } = render(
      <CharacterStakeList
        allCharacters={[unstakedCharacter]}
        activeTokenId={null}
        isStaking={false}
        isUnstaking={false}
        isLoadingStatuses={false}
        canStakeNow
        canUnstakeNow
        pendingSyncTokenIds={new Set([7])}
        handleStake={jest.fn()}
        handleUnstake={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Stake' })).toBeDisabled();

    rerender(
      <CharacterStakeList
        allCharacters={[stakedCharacter]}
        activeTokenId={null}
        isStaking={false}
        isUnstaking={false}
        isLoadingStatuses={false}
        canStakeNow
        canUnstakeNow
        pendingSyncTokenIds={new Set([8])}
        handleStake={jest.fn()}
        handleUnstake={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Unstake' })).toBeDisabled();
  });

  it('disables matching staked-here unstake actions while sync is pending', () => {
    render(
      <StakedHereList
        stakedHere={[
          {
            token_id: 7,
            name: 'Wagdie #7',
            image_url: '/images/placeholder-character.svg',
            owner_address: '0xabc',
            staker_address: '0xabc',
          } as any,
        ]}
        effectiveWallet="0xabc"
        activeTokenId={null}
        isUnstaking={false}
        isLoadingStatuses={false}
        canUnstakeNow
        pendingSyncTokenIds={new Set([7])}
        handleUnstake={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Unstake' })).toBeDisabled();
  });
});
