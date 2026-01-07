/**
 * Infection Indexer - Refactored with Core Module
 *
 * Tracks InfectionSpread events from the Spread contract and
 * Mushroom burn events (TransferSingle/TransferBatch to burn address)
 * from the Mushroom contract.
 * Uses Etherscan API for historical backfill, WebSocket for live events.
 *
 * Feature: 021-indexer-fixes
 */
import type { Log } from 'viem'
import { runIndexer, parseEnvBigInt, parseEnvNumber, getEnv } from './core'
import type { IndexerConfig, IndexerHandler, Address } from './core'
import {
  handleInfectionSpreadLogs,
  handleMushroomBurnLogs,
} from './infection-event-handler'
import { getContractAddresses, TOKEN_IDS } from '../../lib/contracts/addresses'
import { getStartupDelay } from './etherscan-rate-limiter'

// Configuration
const INDEXER_NAME = 'infection-indexer'
const CHAIN_ID = parseEnvNumber('CHAIN_ID', 1)
const addresses = getContractAddresses(CHAIN_ID)
const SPREAD_CONTRACT = addresses.spread as Address
const MUSHROOM_CONTRACT = addresses.mushroom as Address
const MUSHROOM_TOKEN_ID = TOKEN_IDS.mushroom

// Event topic hashes
const INFECTION_SPREAD_TOPIC =
  '0xd7137f8a6563ec0e9c51c992d6758e22562332d1edb4367653058bf857658479' as const
const TRANSFER_SINGLE_TOPIC =
  '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62' as const
const TRANSFER_BATCH_TOPIC =
  '0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb' as const

// Event ABIs for live watching
const infectionSpreadEventAbi = {
  type: 'event',
  name: 'InfectionSpread',
  inputs: [
    { indexed: true, name: 'sender', type: 'address' },
    { indexed: true, name: 'infectedToken', type: 'uint256' },
    { indexed: false, name: 'time', type: 'uint256' },
  ],
  anonymous: false,
} as const

const transferSingleEventAbi = {
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

const transferBatchEventAbi = {
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

/**
 * Wrapper for infection spread handler to match IndexerHandler signature
 */
const infectionSpreadHandler: IndexerHandler = async (logs: Log[]) => {
  return handleInfectionSpreadLogs(logs)
}

/**
 * Factory to create mushroom burn handler bound to a specific token ID
 * The mushroom handler needs the tokenId to filter for specific token burns
 */
function makeMushroomBurnHandler(tokenId: bigint): IndexerHandler {
  return async (logs: Log[]) => {
    return handleMushroomBurnLogs(logs, tokenId)
  }
}

// Create the bound mushroom handler
const mushroomBurnHandler = makeMushroomBurnHandler(MUSHROOM_TOKEN_ID)

// Build indexer configuration
const config: IndexerConfig = {
  name: INDEXER_NAME,
  chainId: CHAIN_ID,
  wsUrl: getEnv('WS_RPC_URL', ''),
  stateFile: getEnv('STATE_FILE', 'scripts/indexer/infection-state.json'),
  stateContract: SPREAD_CONTRACT, // Primary contract for state tracking
  startBlock: parseEnvBigInt('START_BLOCK', 15422334n),
  startupDelayMs: getStartupDelay(INDEXER_NAME),
  etherscan: {
    apiUrl: 'https://api.etherscan.io/v2/api',
    apiKey: process.env.ETHERSCAN_API_KEY,
    chainId: '1',
  },
  backfillSources: [
    // Spread contract - InfectionSpread events
    {
      name: 'InfectionSpread',
      address: SPREAD_CONTRACT,
      topic0: INFECTION_SPREAD_TOPIC,
      handler: infectionSpreadHandler,
      group: 'infection',
    },
    // Mushroom contract - TransferSingle and TransferBatch burns
    // Grouped together so they're merged and processed in block order
    {
      name: 'TransferSingle',
      address: MUSHROOM_CONTRACT,
      topic0: TRANSFER_SINGLE_TOPIC,
      handler: mushroomBurnHandler,
      group: 'mushroom-burns',
    },
    {
      name: 'TransferBatch',
      address: MUSHROOM_CONTRACT,
      topic0: TRANSFER_BATCH_TOPIC,
      handler: mushroomBurnHandler,
      group: 'mushroom-burns',
    },
  ],
  liveWatches: [
    // Spread contract - InfectionSpread events
    {
      name: 'InfectionSpread',
      address: SPREAD_CONTRACT,
      abi: [infectionSpreadEventAbi],
      eventName: 'InfectionSpread',
      handler: infectionSpreadHandler,
    },
    // Mushroom contract - both TransferSingle and TransferBatch
    // Using combined ABI so we can watch both event types
    {
      name: 'MushroomBurns',
      address: MUSHROOM_CONTRACT,
      abi: [transferSingleEventAbi, transferBatchEventAbi],
      // No eventName filter - watch all events from the ABI
      handler: mushroomBurnHandler,
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
