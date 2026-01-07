import type { PublicClient, Log, WatchContractEventReturnType } from 'viem'
import type { LiveWatchConfig, IndexerHandlerResult } from './types'
import type { Logger } from './logger'
import { createLogger } from './logger'
import type { StateStore } from './state-store'
import type { ReconnectController } from './reconnect'
import type { IndexerContext } from '../../discord/types'

/**
 * Options for starting live watches
 */
export interface LiveWatchOptions {
  client: PublicClient
  chainId: number
  stateStore: StateStore
  watches: LiveWatchConfig[]
  reconnect: ReconnectController
  context: IndexerContext
  logger?: Logger
  /** Callback when a watch starts successfully */
  onWatchStarted?: () => void
  /** Callback when all watches encounter errors */
  onAllWatchesFailed?: (reason: string) => void
}

/**
 * Handle returned by startLiveWatches for cleanup
 */
export interface LiveWatchHandle {
  /** Stop all watches */
  stop(): void
  /** Check if watches are currently active */
  isActive(): boolean
}

/**
 * Start live WebSocket watches for all configured events
 * 
 * Logs are processed through a serial queue to ensure ordering.
 * State is persisted after each successful handler invocation.
 */
export function startLiveWatches(options: LiveWatchOptions): LiveWatchHandle {
  const {
    client,
    stateStore,
    watches,
    reconnect,
    context,
    onWatchStarted,
    onAllWatchesFailed,
  } = options
  const logger = options.logger ?? createLogger('live-watch')

  if (watches.length === 0) {
    logger.warn('No live watches configured')
    return {
      stop: () => {},
      isActive: () => false,
    }
  }

  // Serial queue for processing logs
  let liveQueue = Promise.resolve()
  const unwatchers: WatchContractEventReturnType[] = []
  let active = true

  /**
   * Process logs through a handler with state persistence
   */
  async function processLogs(
    watchName: string,
    handler: LiveWatchConfig['handler'],
    logs: Log[]
  ): Promise<void> {
    if (logs.length === 0) return

    try {
      const result: IndexerHandlerResult = await handler(logs, context)
      
      if (result.highestBlock !== null) {
        const advanced = await stateStore.advance(result.highestBlock)
        if (advanced) {
          logger.debug(`${watchName}: state advanced to block ${result.highestBlock}`)
        }
      }

      logger.info(`${watchName}: processed ${result.processed} events`)
    } catch (error) {
      logger.error(`${watchName}: handler error: ${error}`)
      // Don't rethrow - we want to continue watching
    }
  }

  /**
   * Queue logs for serial processing
   */
  function queueLogs(
    watchName: string,
    handler: LiveWatchConfig['handler'],
    logs: Log[]
  ): void {
    liveQueue = liveQueue.then(() => processLogs(watchName, handler, logs))
  }

  /**
   * Handle watch errors
   */
  function handleWatchError(watchName: string, error: Error): void {
    logger.error(`${watchName}: watch error: ${error.message}`)
    
    // Check if all watches have failed
    // (In production, you might want more sophisticated health checking)
    if (onAllWatchesFailed) {
      onAllWatchesFailed(error.message)
    }
  }

  // Start all watches
  logger.info(`Starting ${watches.length} live watch(es)`)

  for (const watch of watches) {
    try {
      const unwatch = client.watchContractEvent({
        address: watch.address,
        abi: watch.abi,
        eventName: watch.eventName,
        onLogs: (logs) => {
          if (!active) return
          queueLogs(watch.name, watch.handler, logs)
        },
        onError: (error) => {
          if (!active) return
          handleWatchError(watch.name, error)
        },
      })

      unwatchers.push(unwatch)
      logger.info(`Started watch: ${watch.name}`)
    } catch (error) {
      logger.error(`Failed to start watch ${watch.name}: ${error}`)
    }
  }

  // Signal successful start
  if (unwatchers.length > 0) {
    reconnect.reset()
    if (onWatchStarted) {
      onWatchStarted()
    }
  }

  /**
   * Stop all watches
   */
  function stop(): void {
    if (!active) return
    
    active = false
    logger.info('Stopping all watches')

    for (const unwatch of unwatchers) {
      try {
        unwatch()
      } catch (error) {
        logger.warn(`Error stopping watch: ${error}`)
      }
    }

    unwatchers.length = 0
  }

  /**
   * Check if watches are active
   */
  function isActive(): boolean {
    return active && unwatchers.length > 0
  }

  return {
    stop,
    isActive,
  }
}
