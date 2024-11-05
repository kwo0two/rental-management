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
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">건물 관리</h1>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* 건물 추가 폼 */}
        <form onSubmit={handleAddBuilding} className="mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              value={newBuildingName}
              onChange={(e) => setNewBuildingName(e.target.value)}
              placeholder="건물 이름"
              className="flex-1 p-2 border rounded"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              건물 추가
            </button>
          </div>
        </form>

        {/* 건물 목록 */}
        {isLoading ? (
          <div>로딩 중...</div>
        ) : (
          <div className="space-y-4">
            {buildings.map((building) => (
              <div
                key={building.id}
                className="p-4 border rounded shadow-sm flex justify-between items-center"
              >
                {editingBuilding?.id === building.id ? (
                  <form onSubmit={handleUpdateBuilding} className="flex-1 flex gap-4">
                    <input
                      type="text"
                      value={editingBuilding.name}
                      onChange={(e) => setEditingBuilding({
                        ...editingBuilding,
                        name: e.target.value
                      })}
                      className="flex-1 p-2 border rounded"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      저장
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingBuilding(null)}
                      className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      취소
                    </button>
                  </form>
                ) : (
                  <>
                    <span className="text-lg">{building.name}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingBuilding(building)}
                        className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDeleteBuilding(building.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        삭제
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
} 