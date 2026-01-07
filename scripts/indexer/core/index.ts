/**
 * Indexer Core Module
 * 
 * Provides shared utilities and a composition-based runner for blockchain indexers.
 * 
 * Usage:
 * ```typescript
 * import { runIndexer, IndexerConfig, parseEnvBigInt } from './core'
 * 
 * const config: IndexerConfig = {
 *   name: 'my-indexer',
 *   chainId: 1,
 *   wsUrl: process.env.WS_RPC_URL!,
 *   stateFile: 'scripts/indexer/my-state.json',
 *   stateContract: '0x...',
 *   startBlock: parseEnvBigInt('START_BLOCK', 15000000n),
 *   etherscan: {
 *     apiUrl: 'https://api.etherscan.io/v2/api',
 *     apiKey: process.env.ETHERSCAN_API_KEY,
 *     chainId: '1',
 *   },
 *   backfillSources: [...],
 *   liveWatches: [...],
 * }
 * 
 * runIndexer(config)
 * ```
 */

// Types
export type {
  Address,
  IndexerHandlerResult,
  IndexerHandler,
  BackfillSource,
  LiveWatchConfig,
  EtherscanConfig,
  BackoffConfig,
  IndexerConfig,
} from './types'
export { DEFAULT_BACKOFF, DEFAULT_ETHERSCAN } from './types'

// Logger
export type { Logger } from './logger'
export { createLogger, nullLogger } from './logger'

// Environment utilities
export {
  parseEnvNumber,
  parseEnvBigInt,
  requireEnv,
  optionalEnv,
  getEnv,
  parseIntAuto,
  delay,
} from './env'

// Address utilities
export {
  ZERO_ADDRESS,
  DEAD_ADDRESS,
  normalizeAddress,
  isSameAddress,
  isBurnAddress,
  isZeroAddress,
  normalizeTokenId,
} from './address'

// Etherscan client
export type {
  EtherscanClientOptions,
  EtherscanFetchParams,
  EtherscanClient,
} from './etherscan'
export { createEtherscanClient, ETHERSCAN_MAX_RESULTS } from './etherscan'
export type { EtherscanLogResult, FetchLogsParams } from './etherscan'

// State store
export type { StateStoreOptions, StateStore } from './state-store'
export { createStateStore } from './state-store'

// Reconnect controller
export type { ReconnectOptions, ReconnectController } from './reconnect'
export { backoffDelay, createReconnectController } from './reconnect'

// Backfill
export type { BackfillOptions, BackfillSummary } from './backfill'
export { runBackfill } from './backfill'

// Live watch
export type { LiveWatchOptions, LiveWatchHandle } from './live-watch'
export { startLiveWatches } from './live-watch'

// Runner
export type { RunnerDeps } from './runner'
export { runIndexer } from './runner'
