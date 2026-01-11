/**
 * Backfill Staking State
 * 
 * Syncs ALL wagdie_characters location_id and staker_address from current chain state.
 * Run this script after deploying changes to ensure DB matches chain state.
 * 
 * Usage: npx tsx scripts/backfill-staking-state.ts
 */
import 'dotenv/config'
import { syncStakingState } from '../lib/services/sync/staking-state-sync'

const BATCH_SIZE = 200
const TOTAL_TOKENS = 6666

async function backfill() {
  console.log('Starting staking state backfill...')
  console.log('Total tokens:', TOTAL_TOKENS)
  console.log('Batch size:', BATCH_SIZE)
  
  let totalSuccess = 0
  let totalFailed = 0
  let totalStaked = 0
  const errors: Array<{ tokenId: number; error?: string }> = []
  
  for (let start = 1; start <= TOTAL_TOKENS; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE - 1, TOTAL_TOKENS)
    const tokenIds = Array.from({ length: end - start + 1 }, (_, i) => start + i)
    
    console.log(`Processing tokens ${start}-${end}...`)
    
    const { results } = await syncStakingState({
      tokenIds,
      chainId: 1,
    })
    
    for (const r of results) {
      if (r.success) {
        totalSuccess++
        if (r.chainLocationId !== '0' && r.locationId) {
          totalStaked++
        }
      } else {
        totalFailed++
        errors.push({ tokenId: r.tokenId, error: r.error })
      }
    }
    
    // Rate limit to avoid RPC issues
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  console.log('\n=== Backfill Complete ===')
  console.log('Total processed:', totalSuccess + totalFailed)
  console.log('Succeeded:', totalSuccess)
  console.log('Failed:', totalFailed)
  console.log('Currently staked:', totalStaked)
  
  if (errors.length > 0) {
    console.log('\nFirst 10 errors:')
    for (const e of errors.slice(0, 10)) {
      console.log('  Token ' + e.tokenId + ': ' + e.error)
    }
  }
}

backfill().catch(console.error)
