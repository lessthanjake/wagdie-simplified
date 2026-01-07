/**
 * Concord Indexer - Refactored with Core Module
 *
 * Indexes ERC1155 TransferSingle and TransferBatch events from TokensOfConcord.
 * Uses Etherscan API for historical backfill, WebSocket for live events.
 *
 * Feature: 021-indexer-fixes
 */
import { runIndexer, parseEnvBigInt, parseEnvNumber, getEnv } from './core'
import type { IndexerConfig, Address } from './core'
import { handleConcordTransferLogs, CONCORD_TOPICS } from './concord-transfer-handler'
import { getContractAddresses } from '../../lib/contracts/addresses'
import { getStartupDelay } from './etherscan-rate-limiter'

// Configuration
const INDEXER_NAME = 'concord-indexer'
const CHAIN_ID = parseEnvNumber('CHAIN_ID', 1)
const addresses = getContractAddresses(CHAIN_ID)
const CONCORD_CONTRACT = addresses.tokensOfConcord as Address

// Event ABIs for live watching (ERC1155)
const transferSingleAbi = {
  type: 'event',
  name: 'TransferSingle',
  inputs: [
    { indexed: true, name: 'operator', type: 'address' },
    { indexed: true, name: 'from', type: 'address' },
    { indexed: true, name: 'to', type: 'address' },
    { indexed: false, name: 'id', type: 'uint256' },
    { indexed: false, name: 'value', type: 'uint256' },
  ],
  anonymous: false,
} as const

const transferBatchAbi = {
  type: 'event',
  name: 'TransferBatch',
  inputs: [
    { indexed: true, name: 'operator', type: 'address' },
    { indexed: true, name: 'from', type: 'address' },
    { indexed: true, name: 'to', type: 'address' },
    { indexed: false, name: 'ids', type: 'uint256[]' },
    { indexed: false, name: 'values', type: 'uint256[]' },
  ],
  anonymous: false,
} as const

// Build indexer configuration
const config: IndexerConfig = {
  name: INDEXER_NAME,
  chainId: CHAIN_ID,
  wsUrl: getEnv('WS_RPC_URL', ''),
  stateFile: getEnv('STATE_FILE', 'scripts/indexer/concord-state.json'),
  stateContract: CONCORD_CONTRACT,
  startBlock: parseEnvBigInt('START_BLOCK', 15400000n),
  startupDelayMs: getStartupDelay(INDEXER_NAME),
  etherscan: {
    apiUrl: 'https://api.etherscan.io/v2/api',
    apiKey: process.env.ETHERSCAN_API_KEY,
    chainId: '1',
  },
  // Both transfer types share the same handler and are grouped together
  backfillSources: [
    {
      name: 'TransferSingle',
      address: CONCORD_CONTRACT,
      topic0: CONCORD_TOPICS.TransferSingle as `0x${string}`,
      handler: handleConcordTransferLogs,
      group: 'concord',
    },
    {
      name: 'TransferBatch',
      address: CONCORD_CONTRACT,
      topic0: CONCORD_TOPICS.TransferBatch as `0x${string}`,
      handler: handleConcordTransferLogs,
      group: 'concord',
    },
  ],
  liveWatches: [
    {
      name: 'TransferSingle',
      address: CONCORD_CONTRACT,
      abi: [transferSingleAbi],
      eventName: 'TransferSingle',
      handler: handleConcordTransferLogs,
    },
    {
      name: 'TransferBatch',
      address: CONCORD_CONTRACT,
      abi: [transferBatchAbi],
      eventName: 'TransferBatch',
      handler: handleConcordTransferLogs,
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
