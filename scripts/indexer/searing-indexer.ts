/**
 * Searing Indexer - Refactored with Core Module
 *
 * Tracks ConcordSeared events on the Searing contract.
 * Uses Etherscan API for historical backfill, WebSocket for live events.
 *
 * Feature: 021-indexer-fixes
 */
import { runIndexer, parseEnvBigInt, parseEnvNumber, getEnv } from './core'
import type { IndexerConfig, Address } from './core'
import { handleSearConcordsLogs } from './searing-event-handler'
import { getContractAddresses } from '../../lib/contracts/addresses'
import { getStartupDelay } from './etherscan-rate-limiter'

// Configuration
const INDEXER_NAME = 'searing-indexer'
const CHAIN_ID = parseEnvNumber('CHAIN_ID', 1)
const addresses = getContractAddresses(CHAIN_ID)
const SEARING_CONTRACT = addresses.searing as Address

// Event topic hash for ConcordSeared(uint16,uint16,address)
const CONCORD_SEARED_TOPIC =
  '0x264071db4c9b45acadae999c5940b63d7f4c982f1d0342dac85d0457f69a167f' as const

// ABI for live watching
const concordSearedEventAbi = {
  type: 'event',
  name: 'ConcordSeared',
  inputs: [
    { indexed: false, name: 'wagdieId', type: 'uint16' },
    { indexed: false, name: 'tokenId', type: 'uint16' },
    { indexed: false, name: 'owner', type: 'address' },
  ],
  anonymous: false,
} as const

// Build indexer configuration
const config: IndexerConfig = {
  name: INDEXER_NAME,
  chainId: CHAIN_ID,
  wsUrl: getEnv('WS_RPC_URL', ''),
  stateFile: getEnv('STATE_FILE', 'scripts/indexer/searing-state.json'),
  stateContract: SEARING_CONTRACT,
  startBlock: parseEnvBigInt('START_BLOCK', 15422334n),
  startupDelayMs: getStartupDelay(INDEXER_NAME),
  etherscan: {
    apiUrl: 'https://api.etherscan.io/v2/api',
    apiKey: process.env.ETHERSCAN_API_KEY,
    chainId: '1',
  },
  backfillSources: [
    {
      name: 'ConcordSeared',
      address: SEARING_CONTRACT,
      topic0: CONCORD_SEARED_TOPIC,
      handler: handleSearConcordsLogs,
    },
  ],
  liveWatches: [
    {
      name: 'ConcordSeared',
      address: SEARING_CONTRACT,
      abi: [concordSearedEventAbi],
      eventName: 'ConcordSeared',
      handler: handleSearConcordsLogs,
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
