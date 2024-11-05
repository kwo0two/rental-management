import { buildingApi } from '@/utils/buildingApi'
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore'

jest.mock('firebase/firestore')

describe('buildingApi', () => {
  const mockBuilding = {
    id: '1',
    name: '테스트 건물',
    userId: 'user1',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getBuildings', () => {
    it('fetches buildings for a user', async () => {
      const mockDocs = [{
        id: mockBuilding.id,
        data: () => ({ name: mockBuilding.name, userId: mockBuilding.userId }),
      }]

      ;(getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockDocs })
      ;(query as jest.Mock).mockReturnValueOnce({})
      ;(where as jest.Mock).mockReturnValueOnce({})

      const result = await buildingApi.getBuildings('user1')

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(mockBuilding)
      expect(collection).toHaveBeenCalled()
      expect(query).toHaveBeenCalled()
      expect(where).toHaveBeenCalled()
    })
  })

  describe('addBuilding', () => {
    it('adds a new building', async () => {
      const newBuilding = {
        name: '새 건물',
        userId: 'user1',
      }

      ;(addDoc as jest.Mock).mockResolvedValueOnce({ id: '2' })

      const result = await buildingApi.addBuilding('user1', newBuilding)

      expect(result).toBe('2')
      expect(collection).toHaveBeenCalled()
      expect(addDoc).toHaveBeenCalled()
    })
  })
}) 