import type { Log } from 'viem'
import type { BackfillSource, IndexerHandlerResult } from './types'
import type { EtherscanClient } from './etherscan'
import type { Logger } from './logger'
import { createLogger } from './logger'
import type { IndexerContext } from '../../discord/types'

/**
 * Options for running backfill
 */
export interface BackfillOptions {
  sources: BackfillSource[]
  fromBlock: bigint
  toBlock: bigint
  context: IndexerContext
  client: EtherscanClient
  logger?: Logger
  /** Callback for progress updates */
  onProgress?: (block: bigint) => Promise<void>
}

/**
 * Summary of backfill results
 */
export interface BackfillSummary {
  totalSources: number
  totalLogs: number
  processed: number
  highestBlock: bigint | null
}

/**
 * Group sources by their group name for merged processing
 */
function groupSources(sources: BackfillSource[]): Map<string, BackfillSource[]> {
  const groups = new Map<string, BackfillSource[]>()
  
  for (const source of sources) {
    const groupKey = source.group ?? source.name // Use name as default group
    const existing = groups.get(groupKey) ?? []
    existing.push(source)
    groups.set(groupKey, existing)
  }
  
  return groups
}

/**
 * Run backfill for all configured sources
 * 
 * Sources with the same `group` will have their logs merged and passed to
 * the handler together. Sources without a group are processed individually.
 */
export async function runBackfill(options: BackfillOptions): Promise<BackfillSummary> {
  const { sources, fromBlock, toBlock, context, client, onProgress } = options
  const logger = options.logger ?? createLogger('backfill')

  if (sources.length === 0) {
    logger.warn('No backfill sources configured')
    return { totalSources: 0, totalLogs: 0, processed: 0, highestBlock: null }
  }

  logger.info(`Starting backfill from block ${fromBlock} to ${toBlock}`)
  logger.info(`Processing ${sources.length} source(s)`)

  const groupedSources = groupSources(sources)
  let totalLogs = 0
  let totalProcessed = 0
  let highestBlock: bigint | null = null

  // Process each group
  for (const [groupName, groupSources] of groupedSources) {
    logger.info(`Processing group: ${groupName} (${groupSources.length} source(s))`)

    // Fetch logs for all sources in this group
    const allLogs: Log[] = []
    
    for (const source of groupSources) {
      logger.info(`Fetching logs for ${source.name} (topic: ${source.topic0.slice(0, 10)}...)`)
      
      try {
        const { logs, stats } = await client.fetchLogsWithSubdivision({
          address: source.address,
          topic0: source.topic0,
          fromBlock,
          toBlock,
        })

        logger.info(
          `${source.name}: ${stats.totalLogs} logs fetched ` +
          `(${stats.apiCalls} API calls, ${stats.subdivisions} subdivisions)`
        )

        if (stats.singleBlockOverflow) {
          logger.warn(`${source.name}: Single block overflow detected - some events may be missed`)
        }

        // Convert to viem logs
        const viemLogs = logs.map((log) => client.toViemLog(log))
        allLogs.push(...viemLogs)
        totalLogs += logs.length
      } catch (error) {
        logger.error(`Failed to fetch logs for ${source.name}: ${error}`)
        throw error
      }
    }

    if (allLogs.length === 0) {
      logger.info(`No logs found for group: ${groupName}`)
      continue
    }

    // Sort all logs by block number and log index
    allLogs.sort((a, b) => {
      const blockDiff = Number((a.blockNumber ?? 0n) - (b.blockNumber ?? 0n))
      if (blockDiff !== 0) return blockDiff
      return (a.logIndex ?? 0) - (b.logIndex ?? 0)
    })

    // Use the first source's handler for the group
    // (all sources in a group should have the same handler)
    const handler = groupSources[0].handler

    logger.info(`Processing ${allLogs.length} logs for group: ${groupName}`)
    
    try {
      const result: IndexerHandlerResult = await handler(allLogs, context)
      totalProcessed += result.processed
      
      if (result.highestBlock !== null) {
        if (highestBlock === null || result.highestBlock > highestBlock) {
          highestBlock = result.highestBlock
        }
      }

      logger.info(`Group ${groupName}: processed ${result.processed} events`)

      // Report progress
      if (onProgress && result.highestBlock !== null) {
        await onProgress(result.highestBlock)
      }
    } catch (error) {
      logger.error(`Failed to process logs for group ${groupName}: ${error}`)
      throw error
    }
  }

  logger.info(
    `Backfill complete: ${totalLogs} logs fetched, ${totalProcessed} events processed`
  )

  return {
    totalSources: sources.length,
    totalLogs,
    processed: totalProcessed,
    highestBlock,
  }
}
