import { loadState, saveState, type IndexerState } from '../block-tracker'
import type { Logger } from './logger'
import { createLogger } from './logger'
import type { Address } from './types'

/**
 * Options for creating a state store
 */
export interface StateStoreOptions {
  stateFile: string
  chainId: number
  contract: Address
  startBlock: bigint
  logger?: Logger
}

/**
 * State store interface for managing indexer progress
 */
export interface StateStore {
  /** Initialize and load existing state, returns last indexed block or null */
  init(): Promise<bigint | null>
  /** Get the current last indexed block */
  getLastIndexedBlock(): bigint | null
  /** 
   * Advance the state to a new block (monotonic - only persists if block > current)
   * @param block - The new block number to advance to
   * @returns true if state was updated, false if block was <= current
   */
  advance(block: bigint): Promise<boolean>
  /** Force persist the current state */
  flush(): Promise<void>
  /** Get the full state object */
  getState(): IndexerState | null
}

/**
 * Create a state store with monotonic block advancement
 * 
 * This ensures that state never regresses even when multiple watches
 * emit events out of order.
 */
export function createStateStore(options: StateStoreOptions): StateStore {
  const { stateFile, chainId, contract, startBlock } = options
  const logger = options.logger ?? createLogger('state-store')

  let currentState: IndexerState | null = null
  let lastIndexedBlock: bigint | null = null

  /**
   * Build a state object for the current block
   */
  function buildState(block: bigint): IndexerState {
    return {
      chainId,
      contract,
      lastIndexedBlock: block.toString(),
    }
  }

  /**
   * Initialize the state store, loading existing state if available
   */
  async function init(): Promise<bigint | null> {
    const loaded = await loadState(stateFile)

    if (loaded) {
      // Validate that state matches our configuration
      if (loaded.chainId !== chainId) {
        logger.warn(
          `State file chain ID (${loaded.chainId}) doesn't match configured chain ID (${chainId}). Starting fresh.`
        )
        currentState = null
        lastIndexedBlock = null
        return null
      }

      if (loaded.contract.toLowerCase() !== contract.toLowerCase()) {
        logger.warn(
          `State file contract (${loaded.contract}) doesn't match configured contract (${contract}). Starting fresh.`
        )
        currentState = null
        lastIndexedBlock = null
        return null
      }

      currentState = loaded
      lastIndexedBlock = BigInt(loaded.lastIndexedBlock)
      logger.info(`Loaded state: last indexed block ${lastIndexedBlock}`)
      return lastIndexedBlock
    }

    logger.info(`No existing state found, will start from block ${startBlock}`)
    currentState = null
    lastIndexedBlock = null
    return null
  }

  /**
   * Get the current last indexed block
   */
  function getLastIndexedBlock(): bigint | null {
    return lastIndexedBlock
  }

  /**
   * Advance the state to a new block (monotonic)
   */
  async function advance(block: bigint): Promise<boolean> {
    // Only advance if block is greater than current
    if (lastIndexedBlock !== null && block <= lastIndexedBlock) {
      logger.debug(`Skipping state update: block ${block} <= current ${lastIndexedBlock}`)
      return false
    }

    lastIndexedBlock = block
    currentState = buildState(block)
    
    await saveState(stateFile, currentState)
    logger.debug(`State advanced to block ${block}`)
    return true
  }

  /**
   * Force persist the current state
   */
  async function flush(): Promise<void> {
    if (currentState) {
      await saveState(stateFile, currentState)
      logger.info(`State flushed: block ${lastIndexedBlock}`)
    }
  }

  /**
   * Get the full state object
   */
  function getState(): IndexerState | null {
    return currentState
  }

  return {
    init,
    getLastIndexedBlock,
    advance,
    flush,
    getState,
  }
}
