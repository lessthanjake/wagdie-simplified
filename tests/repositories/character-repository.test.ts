/**
 * @jest-environment node
 */

import { CharacterRepository, characterRepository, getStakedCharacters } from '@/lib/repositories/character-repository'
import type { Character, CharacterFilters } from '@/types/character'

describe('CharacterRepository facade', () => {
  const filters: CharacterFilters = {
    tab: 'all',
    sort: 'asc',
    page: 1,
    perPage: 20,
  }

  function createFacade() {
    const character: Character = { token_id: 1, owner_address: '0xabc' }
    const queryRepository = {
      findMany: jest.fn().mockResolvedValue({
        characters: [character],
        hasMore: false,
        totalCount: 1,
      }),
      findById: jest.fn().mockResolvedValue(character),
      update: jest.fn().mockResolvedValue(character),
      findConcords: jest.fn().mockResolvedValue([]),
    }
    const traitsRepository = {
      getOrigins: jest.fn().mockResolvedValue({ origins: [], totalCharacters: 0 }),
      getAlignments: jest.fn().mockResolvedValue({ alignments: [], totalCharacters: 0 }),
      getTraitCounts: jest.fn().mockResolvedValue({ traitType: 'Armor', traits: [], totalCharacters: 0 }),
    }
    const stakingRepository = {
      getStakedCharacters: jest.fn().mockResolvedValue([{ ...character, location: null }]),
    }
    const ownershipRepository = {
      getAllTokenIds: jest.fn().mockResolvedValue([1]),
      getCurrentOwnership: jest.fn().mockResolvedValue(new Map([[1, '0xabc']])),
      bulkUpdateOwnership: jest.fn().mockResolvedValue({ updated: 1, failed: 0, errors: [] }),
      updateOwnership: jest.fn().mockResolvedValue(true),
    }

    return {
      repo: new CharacterRepository({
        queryRepository,
        traitsRepository,
        stakingRepository,
        ownershipRepository,
      }),
      queryRepository,
      traitsRepository,
      stakingRepository,
      ownershipRepository,
      character,
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('preserves the singleton and helper exports', () => {
    expect(characterRepository).toBeInstanceOf(CharacterRepository)
    expect(typeof getStakedCharacters).toBe('function')
  })

  it('delegates query methods to the query repository', async () => {
    const { repo, queryRepository, character } = createFacade()

    await expect(repo.findMany(filters)).resolves.toEqual({
      characters: [character],
      hasMore: false,
      totalCount: 1,
    })
    await expect(repo.findById(1)).resolves.toEqual(character)
    await expect(repo.update(1, { name: 'Updated' })).resolves.toEqual(character)
    await expect(repo.findConcords(1)).resolves.toEqual([])

    expect(queryRepository.findMany).toHaveBeenCalledWith(filters)
    expect(queryRepository.findById).toHaveBeenCalledWith(1)
    expect(queryRepository.update).toHaveBeenCalledWith(1, { name: 'Updated' })
    expect(queryRepository.findConcords).toHaveBeenCalledWith(1)
  })

  it('delegates trait, staking, and ownership methods to specialized repositories', async () => {
    const { repo, traitsRepository, stakingRepository, ownershipRepository, character } = createFacade()

    await expect(repo.getOrigins()).resolves.toEqual({ origins: [], totalCharacters: 0 })
    await expect(repo.getAlignments()).resolves.toEqual({ alignments: [], totalCharacters: 0 })
    await expect(repo.getTraitCounts('Armor')).resolves.toEqual({
      traitType: 'Armor',
      traits: [],
      totalCharacters: 0,
    })
    await expect(repo.getStakedCharacters()).resolves.toEqual([{ ...character, location: null }])
    await expect(repo.getAllTokenIds()).resolves.toEqual([1])
    await expect(repo.getCurrentOwnership()).resolves.toEqual(new Map([[1, '0xabc']]))
    await expect(repo.bulkUpdateOwnership([{ tokenId: 1, ownerAddress: '0xdef' }])).resolves.toEqual({
      updated: 1,
      failed: 0,
      errors: [],
    })
    await expect(repo.updateOwnership(1, '0xdef')).resolves.toBe(true)

    expect(traitsRepository.getOrigins).toHaveBeenCalled()
    expect(traitsRepository.getAlignments).toHaveBeenCalled()
    expect(traitsRepository.getTraitCounts).toHaveBeenCalledWith('Armor')
    expect(stakingRepository.getStakedCharacters).toHaveBeenCalled()
    expect(ownershipRepository.getAllTokenIds).toHaveBeenCalled()
    expect(ownershipRepository.getCurrentOwnership).toHaveBeenCalled()
    expect(ownershipRepository.bulkUpdateOwnership).toHaveBeenCalledWith(
      [{ tokenId: 1, ownerAddress: '0xdef' }],
      undefined
    )
    expect(ownershipRepository.updateOwnership).toHaveBeenCalledWith(1, '0xdef', undefined)
  })
})
