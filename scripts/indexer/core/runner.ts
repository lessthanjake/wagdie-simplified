import { createPublicClient, webSocket, type PublicClient } from 'viem'
import { mainnet, sepolia } from 'viem/chains'
import type { IndexerConfig } from './types'
import { DEFAULT_BACKOFF, DEFAULT_ETHERSCAN } from './types'
import { createLogger, type Logger } from './logger'
import { delay } from './env'
import { createEtherscanClient, type EtherscanClient } from './etherscan'
import { createStateStore, type StateStore } from './state-store'
import { createReconnectController, type ReconnectController } from './reconnect'
import { runBackfill } from './backfill'
import { startLiveWatches, type LiveWatchHandle } from './live-watch'
import type { IndexerContext } from '../../discord/types'

/**
 * Optional dependency injection for testing
 */
export interface RunnerDeps {
  createPublicClient?: typeof createPublicClient
  webSocket?: typeof webSocket
  logger?: Logger
}

/**
 * Get the viem chain object for a chain ID
 */
function getChain(chainId: number) {
  switch (chainId) {
    case 1:
      return mainnet
    case 11155111:
      return sepolia
    default:
      return mainnet
  }
}

/**
 * Run an indexer with the provided configuration
 * 
 * This is the main entry point that orchestrates:
 * 1. Startup delay (for staggering multiple indexers)
 * 2. State initialization
 * 3. Historical backfill via Etherscan
 * 4. Live WebSocket watching
 * 5. Graceful shutdown handling
 * 6. Automatic reconnection on WebSocket failure
 */
export async function runIndexer(
  config: IndexerConfig,
  deps: RunnerDeps = {}
): Promise<void> {
  const logger = deps.logger ?? createLogger(config.name)
  const backoff = config.backoff ?? DEFAULT_BACKOFF
  const etherscanConfig = { ...DEFAULT_ETHERSCAN, ...config.etherscan }

  logger.info(`Starting ${config.name}`)
  logger.info(`Chain ID: ${config.chainId}`)
  logger.info(`WebSocket URL: ${config.wsUrl.slice(0, 30)}...`)
  logger.info(`State file: ${config.stateFile}`)
  logger.info(`Backfill sources: ${config.backfillSources.length}`)
  logger.info(`Live watches: ${config.liveWatches.length}`)

  // Startup delay for staggering
  if (config.startupDelayMs && config.startupDelayMs > 0) {
    logger.info(`Startup delay: ${config.startupDelayMs}ms`)
    await delay(config.startupDelayMs)
  }

  // Create components
  const etherscanClient: EtherscanClient = createEtherscanClient({
    apiUrl: etherscanConfig.apiUrl,
    apiKey: etherscanConfig.apiKey,
    chainId: etherscanConfig.chainId,
    callerId: config.name,
    logger,
  })

  const stateStore: StateStore = createStateStore({
    stateFile: config.stateFile,
    chainId: config.chainId,
    contract: config.stateContract,
    startBlock: config.startBlock,
    logger,
  })

  const reconnect: ReconnectController = createReconnectController({
    baseDelayMs: backoff.baseDelayMs,
    maxDelayMs: backoff.maxDelayMs,
    logger,
  })

  // Create indexer contexts for handlers (backfill vs live)
  const backfillContext: IndexerContext = {
    source: 'backfill',
    chainId: config.chainId,
  }
  const liveContext: IndexerContext = {
    source: 'live',
    chainId: config.chainId,
  }

  // Track shutdown state
  let shuttingDown = false
  let liveWatchHandle: LiveWatchHandle | null = null
  let viemClient: PublicClient | null = null

  /**
   * Graceful shutdown handler
   */
  async function shutdown(signal: string): Promise<void> {
    if (shuttingDown) return
    shuttingDown = true

    logger.info(`Received ${signal}, shutting down gracefully...`)

    // Clear reconnect timer
    reconnect.clear()

    // Stop live watches
    if (liveWatchHandle) {
      liveWatchHandle.stop()
      liveWatchHandle = null
    }

    // Flush state
    await stateStore.flush()

    logger.info('Shutdown complete')
    process.exit(0)
  }

  // Register signal handlers
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  // Initialize state
  const lastBlock = await stateStore.init()
  const startFromBlock = lastBlock !== null ? lastBlock + 1n : config.startBlock

  logger.info(`Starting from block ${startFromBlock}`)

  // Create viem client
  const createClient = deps.createPublicClient ?? createPublicClient
  const ws = deps.webSocket ?? webSocket

  viemClient = createClient({
    chain: getChain(config.chainId),
    transport: ws(config.wsUrl),
  })

  // Get current block for backfill target
  let currentBlock: bigint
  try {
    currentBlock = await viemClient.getBlockNumber()
    logger.info(`Current block: ${currentBlock}`)
  } catch (error) {
    logger.error(`Failed to get current block: ${error}`)
    throw error
  }

  // Run backfill if needed
  if (startFromBlock < currentBlock && config.backfillSources.length > 0) {
    logger.info('Starting backfill...')
    
    try {
      const summary = await runBackfill({
        sources: config.backfillSources,
        fromBlock: startFromBlock,
        toBlock: currentBlock,
        context: backfillContext,
        client: etherscanClient,
        logger,
        onProgress: async (block) => {
          await stateStore.advance(block)
        },
      })

      logger.info(
        `Backfill complete: ${summary.totalLogs} logs, ${summary.processed} processed`
      )

      // Update state to current block after backfill
      if (summary.highestBlock !== null) {
        await stateStore.advance(summary.highestBlock)
      }
    } catch (error) {
      logger.error(`Backfill failed: ${error}`)
      throw error
    }
  } else {
    logger.info('No backfill needed')
  }

  // Start live watches with reconnection support
  function startWatching(): void {
    if (shuttingDown) return

    logger.info('Starting live watches...')

    // Recreate client on reconnect (WebSocket may be stale)
    viemClient = createClient({
      chain: getChain(config.chainId),
      transport: ws(config.wsUrl),
    })

    liveWatchHandle = startLiveWatches({
      client: viemClient,
      chainId: config.chainId,
      stateStore,
      watches: config.liveWatches,
      reconnect,
      context: liveContext,
      logger,
      onWatchStarted: () => {
        logger.info('All watches started successfully')
      },
      onAllWatchesFailed: (reason) => {
        if (shuttingDown) return
        
        // Stop current watches
        if (liveWatchHandle) {
          liveWatchHandle.stop()
          liveWatchHandle = null
        }

        // Schedule reconnect
        reconnect.schedule(reason, startWatching)
      },
    })
  }

  // Start watching if we have live watches configured
  if (config.liveWatches.length > 0) {
    startWatching()
  } else {
    logger.info('No live watches configured, backfill-only mode')
  }

  // Keep the process alive
  logger.info(`${config.name} is running. Press Ctrl+C to stop.`)
}
