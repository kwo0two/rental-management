'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { buildingApi } from '@/utils/buildingApi';
import { Building } from '@/types';
import ProtectedLayout from '@/components/ProtectedLayout';

export default function BuildingsPage() {
  const { user } = useAuth();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [newBuildingName, setNewBuildingName] = useState('');
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 건물 목록 로드
  const loadBuildings = async () => {
    try {
      if (!user) return;
      const data = await buildingApi.getBuildings(user.uid);
      setBuildings(data);
    } catch (err) {
      setError('건물 목록을 불러오는데 실패했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBuildings();
  }, [user]);

  // 건물 추가
  const handleAddBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newBuildingName.trim()) return;

    try {
      await buildingApi.addBuilding(user.uid, {
        name: newBuildingName.trim(),
        userId: user.uid,
        createdAt: new Date().toISOString()
      });
      setNewBuildingName('');
      loadBuildings();
    } catch (err) {
      setError('건물 추가에 실패했습니다.');
      console.error(err);
    }
  };

  // 건물 수정
  const handleUpdateBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBuilding) return;

    try {
      await buildingApi.updateBuilding(editingBuilding.id, {
        name: editingBuilding.name
      });
      setEditingBuilding(null);
      loadBuildings();
    } catch (err) {
      setError('건물 수정에 실패했습니다.');
      console.error(err);
    }
  };

  // 건물 삭제
  const handleDeleteBuilding = async (buildingId: string) => {
    if (!window.confirm('정말 이 건물을 삭제하시겠습니까?')) return;

    try {
      await buildingApi.deleteBuilding(buildingId);
      loadBuildings();
    } catch (err) {
      setError('건물 삭제에 실패했습니다.');
      console.error(err);
    }
  };

  return (
    <ProtectedLayout>
      <div className="p-4">
        <div className="mb-4 border-b border-gray-200">
          <h1 className="text-base font-medium text-gray-900 pb-2">건물 관리</h1>
        </div>

        {error && (
          <div className="mb-4 p-2 bg-red-50 border border-red-200 text-sm text-red-600 rounded">
            {error}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded mb-4">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-sm font-medium text-gray-900">새 건물 추가</h2>
          </div>
          <div className="p-4">
            <form onSubmit={handleAddBuilding} className="flex gap-2">
              <input
                type="text"
                value={newBuildingName}
                onChange={(e) => setNewBuildingName(e.target.value)}
                placeholder="건물 이름을 입력하세요"
                className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-1 text-sm text-white bg-blue-500 rounded hover:bg-blue-600 focus:outline-none"
              >
                추가
              </button>
            </form>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-sm font-medium text-gray-900">건물 목록</h2>
              <span className="text-xs text-gray-500">총 {buildings.length}개</span>
            </div>
            <div className="divide-y divide-gray-200">
              {buildings.map((building) => (
                <div key={building.id} className="p-4">
                  {editingBuilding?.id === building.id ? (
                    <form onSubmit={handleUpdateBuilding} className="flex gap-2">
                      <input
                        type="text"
                        value={editingBuilding.name}
                        onChange={(e) => setEditingBuilding({
                          ...editingBuilding,
                          name: e.target.value
                        })}
                        className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1 text-sm text-white bg-green-500 rounded hover:bg-green-600"
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingBuilding(null)}
                        className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                      >
                        취소
                      </button>
                    </form>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-900">{building.name}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingBuilding(building)}
                          className="px-3 py-1 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDeleteBuilding(building.id)}
                          className="px-3 py-1 text-xs text-white bg-red-500 rounded hover:bg-red-600"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {buildings.length === 0 && (
                <div className="p-4 text-sm text-gray-500 text-center">
                  등록된 건물이 없습니다.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
} 