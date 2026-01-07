import type { Log, Abi } from 'viem'
import type { IndexerContext } from '../../discord/types'

export type Address = `0x${string}`

/**
 * Standard result returned by all indexer handlers
 */
export interface IndexerHandlerResult {
  highestBlock: bigint | null
  processed: number
}

/**
 * Standard handler signature for processing blockchain logs
 */
export type IndexerHandler = (
  logs: Log[],
  ctx: IndexerContext
) => Promise<IndexerHandlerResult>

/**
 * Configuration for a single backfill source (Etherscan API)
 */
export interface BackfillSource {
  /** Human-readable name for logging */
  name: string
  /** Contract address to fetch logs from */
  address: Address
  /** Event topic0 (keccak256 of event signature) */
  topic0: `0x${string}`
  /** Handler function to process the logs */
  handler: IndexerHandler
  /** Optional group name - sources in same group are merged before handler call */
  group?: string
}

/**
 * Configuration for a single live WebSocket watch
 */
export interface LiveWatchConfig {
  /** Human-readable name for logging */
  name: string
  /** Contract address to watch */
  address: Address
  /** ABI containing the event definition */
  abi: Abi
  /** Specific event name to watch (optional - watches all if omitted) */
  eventName?: string
  /** Handler function to process the logs */
  handler: IndexerHandler
}

/**
 * Etherscan API configuration
 */
export interface EtherscanConfig {
  apiUrl: string
  apiKey?: string
  chainId: string
}

/**
 * Backoff configuration for reconnection attempts
 */
export interface BackoffConfig {
  baseDelayMs: number
  maxDelayMs: number
}

/**
 * Main configuration for an indexer instance
 */
export interface IndexerConfig {
  /** Unique indexer name for logging and identification */
  name: string
  /** Blockchain chain ID (1 for mainnet, 11155111 for sepolia) */
  chainId: number
  /** WebSocket RPC URL for live event watching */
  wsUrl: string
  /** Path to state persistence file */
  stateFile: string
  /** Primary contract address (used in state file for compatibility) */
  stateContract: Address
  /** Block number to start indexing from if no state exists */
  startBlock: bigint
  /** Optional startup delay in ms (for staggering multiple indexers) */
  startupDelayMs?: number
  /** Etherscan API configuration */
  etherscan: EtherscanConfig
  /** Backoff configuration (defaults provided if omitted) */
  backoff?: BackoffConfig
  /** Sources for historical backfill via Etherscan */
  backfillSources: BackfillSource[]
  /** WebSocket watches for live events */
  liveWatches: LiveWatchConfig[]
}

/**
 * Default backoff configuration
 */
export const DEFAULT_BACKOFF: BackoffConfig = {
  baseDelayMs: 1_000,
  maxDelayMs: 60_000,
}

/**
 * Default Etherscan configuration
 */
export const DEFAULT_ETHERSCAN: EtherscanConfig = {
  apiUrl: 'https://api.etherscan.io/v2/api',
  apiKey: '',
  chainId: '1',
}
