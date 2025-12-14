/**
 * Unit tests for LocationForm (map editor)
 *
 * Coverage:
 * - Create mode: create_new payload when "__new__" selected
 * - Create mode: move_existing payload when existing location selected
 * - Edit mode: edit_existing payload with only changed fields
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LocationForm, type LocationFormSubmit } from '@/components/map-editor/LocationForm'
import type { Location } from '@/lib/types/map'

function makeLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: 'loc-1',
    name: 'The Abyss',
    description: 'A dark and treacherous realm',
    metadata: {
      bounds: [
        [0, 0],
        [50, 50],
      ],
      center: [25, 25],
      coordinates: { x: 25, y: 25 },
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('LocationForm (map editor)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('create mode', () => {
    it('submits create_new when "Create new location" is selected', async () => {
      const user = userEvent.setup()
      const onSave = jest.fn<Promise<void>, [LocationFormSubmit]>().mockResolvedValue(undefined)
      const onCancel = jest.fn()

      render(
        <LocationForm
          mode="create"
          locations={[makeLocation({ id: 'loc-existing', name: 'Existing' })]}
          coordinates={{ x: 123.4, y: 567.8 }}
          onSave={onSave}
          onCancel={onCancel}
          isSubmitting={false}
        />
      )

      await user.type(screen.getByLabelText(/name/i), '  New Place  ')
      await user.type(screen.getByLabelText(/description/i), '  hello  ')

      await user.click(screen.getByRole('button', { name: /^save$/i }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave).toHaveBeenCalledWith({
        kind: 'create_new',
        input: {
          name: 'New Place',
          description: 'hello',
          coordinates: { x: 123.4, y: 567.8 },
        },
      })
    })

    it('submits move_existing when an existing location is selected', async () => {
      const user = userEvent.setup()
      const onSave = jest.fn<Promise<void>, [LocationFormSubmit]>().mockResolvedValue(undefined)
      const onCancel = jest.fn()

      render(
        <LocationForm
          mode="create"
          locations={[
            makeLocation({ id: 'loc-a', name: 'A' }),
            makeLocation({ id: 'loc-b', name: 'B' }),
          ]}
          coordinates={{ x: 10, y: 20 }}
          onSave={onSave}
          onCancel={onCancel}
          isSubmitting={false}
        />
      )

      const actionSelect = screen.getByRole('combobox')
      await user.selectOptions(actionSelect, 'loc-b')

      // Name/description fields are hidden for move flow
      expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/description/i)).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /^move$/i }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave).toHaveBeenCalledWith({
        kind: 'move_existing',
        locationId: 'loc-b',
        input: {
          coordinates: { x: 10, y: 20 },
        },
      })
    })
  })

  describe('edit mode', () => {
    it('submits edit_existing with only changed fields', async () => {
      const user = userEvent.setup()
      const onSave = jest.fn<Promise<void>, [LocationFormSubmit]>().mockResolvedValue(undefined)
      const onCancel = jest.fn()

      const location = makeLocation({
        id: 'loc-edit',
        name: 'Old Name',
        description: 'Old desc',
        metadata: {
          bounds: [
            [0, 0],
            [50, 50],
          ],
          coordinates: { x: 1, y: 2 },
          center: [1, 2],
        },
      })

      render(
        <LocationForm
          mode="edit"
          location={location}
          coordinates={{ x: 1, y: 2 }}
          onSave={onSave}
          onCancel={onCancel}
          isSubmitting={false}
        />
      )

      const nameInput = screen.getByLabelText(/name/i)
      await user.clear(nameInput)
      await user.type(nameInput, 'New Name')

      await user.click(screen.getByRole('button', { name: /^save$/i }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave).toHaveBeenCalledWith({
        kind: 'edit_existing',
        locationId: 'loc-edit',
        input: {
          name: 'New Name',
        },
      })
    })
  })
})

