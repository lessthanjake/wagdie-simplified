import type { Log } from 'viem'
import type { EtherscanLogResult, FetchLogsParams } from '../utils/pagination'
import { fetchLogsWithSubdivision, ETHERSCAN_MAX_RESULTS } from '../utils/pagination'
import { rateLimitedFetch, isEtherscanRateLimitResponse } from '../etherscan-rate-limiter'
import { parseIntAuto } from './env'
import type { Logger } from './logger'
import { createLogger } from './logger'

export { ETHERSCAN_MAX_RESULTS }
export type { EtherscanLogResult, FetchLogsParams }

/**
 * Options for creating an Etherscan client
 */
export interface EtherscanClientOptions {
  apiUrl: string
  apiKey?: string
  chainId: string
  callerId: string
  logger?: Logger
}

/**
 * Parameters for fetching logs
 */
export interface EtherscanFetchParams {
  address: string
  topic0: string
  fromBlock: bigint
  toBlock: bigint | 'latest'
}

/**
 * Etherscan client interface
 */
export interface EtherscanClient {
  /** Fetch raw Etherscan log results */
  fetchLogs(params: EtherscanFetchParams): Promise<EtherscanLogResult[]>
  /** Convert Etherscan log to viem Log format */
  toViemLog(log: EtherscanLogResult): Log
  /** Fetch logs and convert to viem format */
  fetchViemLogs(params: EtherscanFetchParams): Promise<Log[]>
  /** Fetch logs with automatic subdivision for complete coverage */
  fetchLogsWithSubdivision(params: EtherscanFetchParams): Promise<{
    logs: EtherscanLogResult[]
    stats: { totalLogs: number; apiCalls: number; subdivisions: number; singleBlockOverflow: boolean }
  }>
}

/**
 * Create an Etherscan API client with rate limiting and pagination support
 */
export function createEtherscanClient(opts: EtherscanClientOptions): EtherscanClient {
  const { apiUrl, apiKey = '', chainId, callerId } = opts
  const logger = opts.logger ?? createLogger(callerId)

  /**
   * Build Etherscan API URL for getLogs
   */
  function buildUrl(params: EtherscanFetchParams): string {
    const toBlockStr = params.toBlock === 'latest' ? 'latest' : params.toBlock.toString()
    
    const searchParams = new URLSearchParams({
      chainid: chainId,
      module: 'logs',
      action: 'getLogs',
      address: params.address,
      topic0: params.topic0,
      fromBlock: params.fromBlock.toString(),
      toBlock: toBlockStr,
      apikey: apiKey,
    })

    return `${apiUrl}?${searchParams.toString()}`
  }

  /**
   * Fetch logs from Etherscan with rate limiting
   */
  async function fetchLogs(params: EtherscanFetchParams): Promise<EtherscanLogResult[]> {
    const url = buildUrl(params)

    const doFetch = async (): Promise<EtherscanLogResult[]> => {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Etherscan API error: ${response.status} ${response.statusText}`)
      }

      const data = (await response.json()) as {
        status: string
        message: string
        result: EtherscanLogResult[] | string
      }

      // Check for rate limit response
      if (isEtherscanRateLimitResponse(data)) {
        throw new Error('Etherscan rate limit exceeded')
      }

      // Handle "No records found" as empty array
      if (data.status === '0' && data.message === 'No records found') {
        return []
      }

      // Handle other errors
      if (data.status !== '1' || typeof data.result === 'string') {
        throw new Error(`Etherscan API error: ${data.message}`)
      }

      return data.result
    }

    const result = await rateLimitedFetch(callerId, doFetch, (error) => {
      if (error instanceof Error) {
        return error.message.includes('rate limit')
      }
      return false
    })

    return result.data
  }

  /**
   * Convert Etherscan log format to viem Log format
   */
  function toViemLog(ethLog: EtherscanLogResult): Log {
    return {
      address: ethLog.address as `0x${string}`,
      topics: ethLog.topics as [`0x${string}`, ...`0x${string}`[]],
      data: ethLog.data as `0x${string}`,
      blockNumber: BigInt(parseIntAuto(ethLog.blockNumber)),
      transactionHash: ethLog.transactionHash as `0x${string}`,
      transactionIndex: parseIntAuto(ethLog.transactionIndex),
      blockHash: '0x' as `0x${string}`, // Not provided by Etherscan
      logIndex: parseIntAuto(ethLog.logIndex),
      removed: false,
    }
  }

  /**
   * Fetch logs and convert to viem format
   */
  async function fetchViemLogs(params: EtherscanFetchParams): Promise<Log[]> {
    const logs = await fetchLogs(params)
    return logs.map(toViemLog)
  }

  /**
   * Fetch logs with automatic subdivision for complete coverage
   */
  async function fetchLogsWithSubdivisionWrapper(params: EtherscanFetchParams): Promise<{
    logs: EtherscanLogResult[]
    stats: { totalLogs: number; apiCalls: number; subdivisions: number; singleBlockOverflow: boolean }
  }> {
    // Convert to FetchLogsParams format (toBlock must be bigint)
    const toBlock = params.toBlock === 'latest' 
      ? BigInt(Number.MAX_SAFE_INTEGER) // Use a very large number for 'latest'
      : params.toBlock

    return fetchLogsWithSubdivision(
      (p) => fetchLogs({ ...p, toBlock: p.toBlock }),
      {
        address: params.address,
        topic0: params.topic0,
        fromBlock: params.fromBlock,
        toBlock,
      },
      (msg) => logger.info(msg)
    )
  }

  return {
    fetchLogs,
    toViemLog,
    fetchViemLogs,
    fetchLogsWithSubdivision: fetchLogsWithSubdivisionWrapper,
  }
}
