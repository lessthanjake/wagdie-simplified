import { NextRequest } from 'next/server'
import { parseIntegerBodyParam, parseStringBodyParam, parseTokenIdParam } from '@/lib/api/params'
import { getErrorMessage, jsonNoStore, jsonNoStoreError, parseJsonBody } from '@/lib/api/responses'
import {
  getConfiguredSearingChainId,
  searingMaterializationService,
} from '@/lib/services/searing-materialization-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SyncBody = {
  transactionHash?: unknown
  txHash?: unknown
  eventId?: unknown
  chainId?: unknown
  retryFailed?: unknown
  repairCompleted?: unknown
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ tokenId: string }> }
) {
  const params = await context.params
  const tokenId = parseTokenIdParam(params.tokenId, { min: 0 })
  if (tokenId === null) {
    return jsonNoStoreError('Invalid token ID', 400)
  }

  const parsedBody = await parseJsonBody<unknown>(request)
  const body: SyncBody = parsedBody && typeof parsedBody === 'object' ? parsedBody as SyncBody : {}

  const transactionHash = parseStringBodyParam(body.transactionHash) || parseStringBodyParam(body.txHash)
  const retryFailed = body.retryFailed === true
  const repairCompleted = body.repairCompleted === true

  try {
    if (!transactionHash) {
      return jsonNoStoreError('transactionHash is required for public searing sync', 400)
    }

    const requestedChainId = parseIntegerBodyParam(body.chainId)
    const configuredChainId = getConfiguredSearingChainId()
    if (requestedChainId !== undefined && requestedChainId !== configuredChainId) {
      return jsonNoStoreError('chainId does not match server configuration', 400)
    }

    const result = await searingMaterializationService.verifyTransactionAndMaterialize({
      tokenId,
      transactionHash,
      retryFailed,
      repairCompleted,
    })
    return jsonNoStore(result)
  } catch (error) {
    const message = getErrorMessage(error, 'Failed to sync searing materialization')
    const status = message === 'Invalid transaction hash' ? 400 : 500
    return jsonNoStoreError(message, status)
  }
}
