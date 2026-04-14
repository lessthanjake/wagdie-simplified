import { CHARACTERS_TABLE } from '@/lib/db/tables'
import { supabase } from '@/lib/supabase'

type OwnershipSupabaseClient = {
  from: (table: string) => unknown
}

type OwnershipUpdate = {
  tokenId: number
  ownerAddress: string | null
}

type OwnershipUpdateResult = {
  updated: number
  failed: number
  errors: Error[]
}

/**
 * Handles ownership reads and writes used by sync/indexer flows.
 */
export class CharacterOwnershipRepository {
  /**
   * Get all token IDs from the database
   */
  async getAllTokenIds(): Promise<number[]> {
    const { data, error } = await supabase!
      .from(CHARACTERS_TABLE)
      .select('token_id')
      .order('token_id', { ascending: true })

    if (error) {
      console.error('Error fetching token IDs:', error)
      throw new Error(`Failed to fetch token IDs: ${error.message}`)
    }

    return ((data || []) as unknown as Array<{ token_id: number }>).map((row) => row.token_id)
  }

  /**
   * Get current ownership state for all characters
   * Returns a map of tokenId -> owner_address
   */
  async getCurrentOwnership(): Promise<Map<number, string | null>> {
    const { data, error } = await supabase!
      .from(CHARACTERS_TABLE)
      .select('token_id, owner_address')

    if (error) {
      console.error('Error fetching ownership:', error)
      throw new Error(`Failed to fetch ownership: ${error.message}`)
    }

    const ownershipMap = new Map<number, string | null>()
    for (const row of (data || []) as unknown as Array<{ token_id: number; owner_address: string | null }>) {
      ownershipMap.set(row.token_id, row.owner_address?.toLowerCase() || null)
    }

    return ownershipMap
  }

  /**
   * Bulk update ownership for multiple characters
   * Updates each record individually to avoid constraint issues
   */
  async bulkUpdateOwnership(
    updates: OwnershipUpdate[],
    client: OwnershipSupabaseClient = supabase!
  ): Promise<OwnershipUpdateResult> {
    const errors: Error[] = []
    let updated = 0
    let failed = 0

    // Process in batches of 50 for parallel updates
    const batchSize = 50
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize)

      // Run updates in parallel within each batch
      const results = await Promise.allSettled(
        batch.map(async (u) => {
          // Cast required: Supabase generated types may not allow partial updates on this table
          const query = client.from(CHARACTERS_TABLE) as unknown as {
            update: (values: Record<string, unknown>) => {
              eq: (column: string, value: number) => Promise<{ error: { message: string } | null }>
            }
          }
          const { error } = await query
            .update({
              owner_address: u.ownerAddress?.toLowerCase() || null,
              updated_at: new Date().toISOString(),
            })
            .eq('token_id', u.tokenId)

          if (error) {
            throw new Error(`Token ${u.tokenId}: ${error.message}`)
          }
          return u.tokenId
        })
      )

      // Count successes and failures
      for (const result of results) {
        if (result.status === 'fulfilled') {
          updated++
        } else {
          failed++
          errors.push(new Error(result.reason?.message || 'Unknown error'))
        }
      }
    }

    return { updated, failed, errors }
  }

  /**
   * Update ownership for a single character
   */
  async updateOwnership(
    tokenId: number,
    ownerAddress: string | null,
    client: OwnershipSupabaseClient = supabase!
  ): Promise<boolean> {
    // Cast required: Supabase generated types may not allow partial updates on this table
    const query = client.from(CHARACTERS_TABLE) as unknown as {
      update: (values: Record<string, unknown>) => {
        eq: (column: string, value: number) => Promise<{ error: { message: string } | null }>
      }
    }
    const { error } = await query
      .update({
        owner_address: ownerAddress?.toLowerCase() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('token_id', tokenId)

    if (error) {
      console.error(`Error updating ownership for token ${tokenId}:`, error)
      return false
    }

    return true
  }
}

export type { OwnershipSupabaseClient, OwnershipUpdate, OwnershipUpdateResult }
