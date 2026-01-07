/**
 * Transfer Indexer - Refactored with Core Module
 *
 * Tracks ERC721 Transfer events on the WAGDIE contract.
 * Uses Etherscan API for historical backfill, WebSocket for live events.
 *
 * Feature: 021-indexer-fixes
 */
import { runIndexer, parseEnvBigInt, parseEnvNumber, getEnv } from './core'
import type { IndexerConfig, Address } from './core'
import { handleTransferLogs } from './event-handler'
import { getContractAddresses } from '../../lib/contracts/addresses'
import { getStartupDelay } from './etherscan-rate-limiter'

// Configuration
const INDEXER_NAME = 'transfer-indexer'
const CHAIN_ID = parseEnvNumber('CHAIN_ID', 1)
const addresses = getContractAddresses(CHAIN_ID)
const WAGDIE_CONTRACT = addresses.wagdie as Address

// ERC721 Transfer event topic: keccak256("Transfer(address,address,uint256)")
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' as const

// Transfer event ABI for live watching
const transferEventAbi = {
  type: 'event',
  name: 'Transfer',
  inputs: [
    { indexed: true, name: 'from', type: 'address' },
    { indexed: true, name: 'to', type: 'address' },
    { indexed: true, name: 'tokenId', type: 'uint256' },
  ],
  anonymous: false,
} as const

// Build indexer configuration
const config: IndexerConfig = {
  name: INDEXER_NAME,
  chainId: CHAIN_ID,
  wsUrl: getEnv('WS_RPC_URL', ''),
  stateFile: getEnv('STATE_FILE', 'scripts/indexer/state.json'),
  stateContract: WAGDIE_CONTRACT,
  startBlock: parseEnvBigInt('START_BLOCK', 15422334n),
  startupDelayMs: getStartupDelay(INDEXER_NAME),
  etherscan: {
    apiUrl: 'https://api.etherscan.io/v2/api',
    apiKey: process.env.ETHERSCAN_API_KEY,
    chainId: '1',
  },
  backfillSources: [
    {
      name: 'Transfer',
      address: WAGDIE_CONTRACT,
      topic0: TRANSFER_TOPIC,
      handler: handleTransferLogs,
    },
  ],
  liveWatches: [
    {
      name: 'Transfer',
      address: WAGDIE_CONTRACT,
      abi: [transferEventAbi],
      eventName: 'Transfer',
      handler: handleTransferLogs,
    },
  ],
}

// Validate required environment
if (!config.wsUrl) {
  console.error(`[${INDEXER_NAME}] WS_RPC_URL is required`)
  process.exit(1)
}

if (!process.env.ETHERSCAN_API_KEY) {
  console.warn(`[${INDEXER_NAME}] Warning: ETHERSCAN_API_KEY not set, rate limits will be stricter`)
}

// Run the indexer
runIndexer(config).catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[${INDEXER_NAME}] Fatal error: ${message}`)
  process.exit(1)
})
