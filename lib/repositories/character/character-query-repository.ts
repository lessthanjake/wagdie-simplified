import { getSupabaseAdmin, supabase } from '@/lib/supabase'
import { CHARACTERS_TABLE } from '@/lib/db/tables'
import { isBurnedOwner } from '@/lib/utils/blockchain'
import type {
  Character,
  CharacterConcord,
  CharacterFilters,
  CharactersResponse,
  Concord,
  EditableCharacterFields,
} from '@/types/character'

/**
 * Handles core character listing, lookup, updates, and concord queries.
 */
export class CharacterQueryRepository {
  /**
   * Find characters with filtering, pagination, and sorting
   */
  async findMany(filters: CharacterFilters): Promise<CharactersResponse> {
    // Safety net: 'owned' tab without wallet returns empty (not all characters)
    if (filters.tab === 'owned' && !filters.wallet) {
      return { characters: [], hasMore: false, totalCount: 0 }
    }

    let query = supabase!
      .from(CHARACTERS_TABLE)
      .select('*', { count: 'exact' })

    // Apply wallet filter whenever wallet is provided
    // This allows wallet-scoped queries for any tab (owned, staked, etc.)
    // For 'owned' tab, include characters where user is either the owner OR the staker
    // (staker_address is set when character is staked, owner_address becomes the contract)
    if (filters.wallet) {
      const walletLower = filters.wallet.toLowerCase()
      if (filters.tab === 'owned') {
        // Include both owned (unstaked) and staked-by-user characters
        query = query.or(`owner_address.eq.${walletLower},staker_address.eq.${walletLower}`)
      } else {
        query = query.eq('owner_address', walletLower)
      }
    }

    // Apply tab-specific filters (additive to wallet filter)
    if (filters.tab === 'infected') {
      // `wagdie_characters` uses the canonical infection_status enum
      query = query.eq('infection_status', 'infected')
    } else if (filters.tab === 'cured') {
      // Cured means 'not infected' - includes both 'healthy' and 'cured' statuses
      query = query.neq('infection_status', 'infected')
    } else if (filters.tab === 'staked') {
      // Staked characters are those with a non-null location_id
      query = query.not('location_id', 'is', null)
    } else if (filters.tab === 'fallen') {
      // Fallen Warriors: characters with burned flag = true
      query = query.eq('burned', true)
    }
    // Note: 'owned' and 'all' tabs only use the wallet filter above

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.trim()
      // Check if search is a number (token ID search)
      const tokenIdSearch = parseInt(searchTerm, 10)
      if (!isNaN(tokenIdSearch) && tokenIdSearch > 0) {
        query = query.eq('token_id', tokenIdSearch)
      } else {
        // Search by name in metadata (case-insensitive)
        query = query.ilike('metadata->>name', `%${searchTerm}%`)
      }
    }

    // Has sheet filter - characters with custom data (name, stats, level, or background)
    // A character "has sheet" if any player-edited field is populated
    if (filters.hasSheet) {
      query = query.or(
        'name.not.is.null,' +           // Custom name
        'str.not.is.null,' +            // Core stats defined
        'level.gt.1,' +                 // Level > 1 (default is 1)
        'background_story.not.is.null'  // Custom backstory
      )
    }

    // NEW: Origin filter - filter by Body trait in metadata JSONB
    if (filters.origin) {
      query = query.contains('metadata', {
        attributes: [{ trait_type: 'Body', value: filters.origin }]
      })
    }

    // Alignment filter - filter by Alignment trait in metadata JSONB
    if (filters.alignment) {
      query = query.contains('metadata', {
        attributes: [{ trait_type: 'Alignment', value: filters.alignment }]
      })
    }

    // Equipment filters - filter by Armor, Back, Mask traits in metadata JSONB
    if (filters.armor) {
      query = query.contains('metadata', {
        attributes: [{ trait_type: 'Armor', value: filters.armor }]
      })
    }
    if (filters.back) {
      query = query.contains('metadata', {
        attributes: [{ trait_type: 'Back', value: filters.back }]
      })
    }
    if (filters.mask) {
      query = query.contains('metadata', {
        attributes: [{ trait_type: 'Mask', value: filters.mask }]
      })
    }

    // Apply sorting
    const sortColumn = 'token_id'
    query = query.order(sortColumn, { ascending: filters.sort === 'asc' })

    // Apply pagination
    const from = (filters.page - 1) * filters.perPage
    const to = from + filters.perPage - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching characters:', error)
      throw new Error(`Failed to fetch characters: ${error.message}`)
    }

    const totalCount = count || 0
    const hasMore = totalCount > filters.page * filters.perPage

    // Normalize burned flag based on owner_address rule
    const rows = (data || []) as unknown as Character[]
    const characters = rows.map((row) => ({
      ...row,
      burned: isBurnedOwner(row.owner_address, row.burned),
    })) as Character[]

    return {
      characters,
      hasMore,
      totalCount
    }
  }

  /**
   * Find a single character by token ID
   */
  async findById(tokenId: number): Promise<Character | null> {
    const { data, error } = await supabase!
      .from(CHARACTERS_TABLE)
      .select('*')
      .eq('token_id', tokenId)
      .single()

    if (error) {
      console.error(`Error fetching character ${tokenId}:`, error)
      return null
    }

    // Normalize burned flag based on owner_address rule
    const character = data as unknown as Character
    return {
      ...character,
      burned: isBurnedOwner(character.owner_address, character.burned),
    } as Character
  }

  /**
   * Update character data
   * Uses admin client (service role) to bypass RLS since auth is handled at API route level
   */
  async update(
    tokenId: number,
    updates: Partial<Pick<Character, EditableCharacterFields>>
  ): Promise<Character | null> {
    // Use admin client for writes - auth/ownership is validated at API route level
    const client = getSupabaseAdmin()
    if (!client) {
      console.error('[Repository] Supabase admin client not initialized (missing service role key)')
      throw new Error('Database client not configured. Please check server configuration.')
    }

    // Cast required: Supabase generated types may not allow partial updates on this table
    const query = client.from(CHARACTERS_TABLE) as unknown as {
      update: (values: Record<string, unknown>) => {
        eq: (column: string, value: number) => {
          select: () => {
            single: () => Promise<{ data: unknown; error: { message: string } | null }>
          }
        }
      }
    }
    const { data, error } = await query
      .update(updates as Record<string, unknown>)
      .eq('token_id', tokenId)
      .select()
      .single()

    if (error) {
      console.error(`[Repository] Error updating character ${tokenId}:`, error.message)
      throw new Error(`Failed to update character: ${error.message}`)
    }

    // Normalize burned flag based on owner_address rule
    const character = data as Character
    return {
      ...character,
      burned: isBurnedOwner(character.owner_address, character.burned),
    } as Character
  }

  /**
   * Find concords owned by a character
   */
  async findConcords(tokenId: number): Promise<Array<CharacterConcord & { concord: Concord }>> {
    const { data, error } = await supabase!
      .from('character_concords')
      .select(`
        *,
        concord:concords(*)
      `)
      .eq('token_id', tokenId)

    if (error) {
      console.error(`Error fetching concords for character ${tokenId}:`, error)
      throw new Error(`Failed to fetch character concords: ${error.message}`)
    }

    return data as Array<CharacterConcord & { concord: Concord }>
  }
}
