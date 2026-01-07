/**
 * Staking Indexer - Refactored with Core Module
 *
 * Tracks WagdieStaked, WagdieUnstaked, WagdieLocationChanged, and WagdieBurned
 * events on the WagdieWorld contract.
 * Uses Etherscan API for historical backfill, WebSocket for live events.
 *
 * Feature: 021-indexer-fixes
 */
import { runIndexer, parseEnvBigInt, parseEnvNumber, getEnv } from './core'
import type { IndexerConfig, Address } from './core'
import { handleStakingLogs, STAKING_TOPICS } from './staking-event-handler'
import { getContractAddresses } from '../../lib/contracts/addresses'
import { getStartupDelay } from './etherscan-rate-limiter'

// Configuration
const INDEXER_NAME = 'staking-indexer'
const CHAIN_ID = parseEnvNumber('CHAIN_ID', 1)
const addresses = getContractAddresses(CHAIN_ID)
const WAGDIE_WORLD_CONTRACT = addresses.wagdieWorld as Address

// Event ABIs for live watching
const wagdieStakedAbi = {
  type: 'event',
  name: 'WagdieStaked',
  inputs: [
    { indexed: false, name: 'wagdieId', type: 'uint16' },
    { indexed: false, name: 'owner', type: 'address' },
    { indexed: false, name: 'locationId', type: 'uint64' },
  ],
  anonymous: false,
} as const

const wagdieUnstakedAbi = {
  type: 'event',
  name: 'WagdieUnstaked',
  inputs: [
    { indexed: false, name: 'wagdieId', type: 'uint16' },
    { indexed: false, name: 'owner', type: 'address' },
    { indexed: false, name: 'locationId', type: 'uint64' },
  ],
  anonymous: false,
} as const

const wagdieLocationChangedAbi = {
  type: 'event',
  name: 'WagdieLocationChanged',
  inputs: [
    { indexed: false, name: 'wagdieId', type: 'uint16' },
    { indexed: false, name: 'oldLocationId', type: 'uint64' },
    { indexed: false, name: 'newLocationId', type: 'uint64' },
  ],
  anonymous: false,
} as const

const wagdieBurnedAbi = {
  type: 'event',
  name: 'WagdieBurned',
  inputs: [
    { indexed: false, name: 'wagdieId', type: 'uint16' },
    { indexed: false, name: 'locationId', type: 'uint64' },
  ],
  anonymous: false,
} as const

// Build indexer configuration
const config: IndexerConfig = {
  name: INDEXER_NAME,
  chainId: CHAIN_ID,
  wsUrl: getEnv('WS_RPC_URL', ''),
  stateFile: getEnv('STATE_FILE', 'scripts/indexer/staking-state.json'),
  stateContract: WAGDIE_WORLD_CONTRACT,
  startBlock: parseEnvBigInt('START_BLOCK', 15422334n),
  startupDelayMs: getStartupDelay(INDEXER_NAME),
  etherscan: {
    apiUrl: 'https://api.etherscan.io/v2/api',
    apiKey: process.env.ETHERSCAN_API_KEY,
    chainId: '1',
  },
  // All 4 staking event types share the same handler and are grouped together
  // so logs are merged and processed in block order
  backfillSources: [
    {
      name: 'WagdieStaked',
      address: WAGDIE_WORLD_CONTRACT,
      topic0: STAKING_TOPICS.WagdieStaked as `0x${string}`,
      handler: handleStakingLogs,
      group: 'staking',
    },
    {
      name: 'WagdieUnstaked',
      address: WAGDIE_WORLD_CONTRACT,
      topic0: STAKING_TOPICS.WagdieUnstaked as `0x${string}`,
      handler: handleStakingLogs,
      group: 'staking',
    },
    {
      name: 'WagdieLocationChanged',
      address: WAGDIE_WORLD_CONTRACT,
      topic0: STAKING_TOPICS.WagdieLocationChanged as `0x${string}`,
      handler: handleStakingLogs,
      group: 'staking',
    },
    {
      name: 'WagdieBurned',
      address: WAGDIE_WORLD_CONTRACT,
      topic0: STAKING_TOPICS.WagdieBurned as `0x${string}`,
      handler: handleStakingLogs,
      group: 'staking',
    },
  ],
  liveWatches: [
    {
      name: 'WagdieStaked',
      address: WAGDIE_WORLD_CONTRACT,
      abi: [wagdieStakedAbi],
      eventName: 'WagdieStaked',
      handler: handleStakingLogs,
    },
    {
      name: 'WagdieUnstaked',
      address: WAGDIE_WORLD_CONTRACT,
      abi: [wagdieUnstakedAbi],
      eventName: 'WagdieUnstaked',
      handler: handleStakingLogs,
    },
    {
      name: 'WagdieLocationChanged',
      address: WAGDIE_WORLD_CONTRACT,
      abi: [wagdieLocationChangedAbi],
      eventName: 'WagdieLocationChanged',
      handler: handleStakingLogs,
    },
    {
      name: 'WagdieBurned',
      address: WAGDIE_WORLD_CONTRACT,
      abi: [wagdieBurnedAbi],
      eventName: 'WagdieBurned',
      handler: handleStakingLogs,
    },
  ],
}

// Validate required environment
if (!config.wsUrl) {
  console.error(`[${INDEXER_NAME}] WS_RPC_URL is required`)
  process.exit(1)
}

if (!process.env.ETHERSCAN_API_KEY) {
  console.warn(
    `[${INDEXER_NAME}] Warning: ETHERSCAN_API_KEY not set, rate limits will be stricter`
  )
}

// Run the indexer
runIndexer(config).catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[${INDEXER_NAME}] Fatal error: ${message}`)
  process.exit(1)
})
