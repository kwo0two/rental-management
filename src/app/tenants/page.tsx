'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { buildingApi } from '@/utils/buildingApi';
import { tenantApi } from '@/utils/tenantApi';
import { Building, Tenant } from '@/types';
import ProtectedLayout from '@/components/ProtectedLayout';

// 새 임대인 정보의 타입 정의
interface NewTenantForm {
  name: string;
  startDate: string;
  monthlyRent: string;
  paymentType: 'full' | 'prorated';  // 리터럴 유니온 타입으로 정의
  contractEndDate: string;
}

export default function TenantsPage() {
  const { user } = useAuth();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 새 임대인 정보 상태에 타입 적용
  const [newTenant, setNewTenant] = useState<NewTenantForm>({
    name: '',
    startDate: '',
    monthlyRent: '',
    paymentType: 'full',
    contractEndDate: ''
  });

  // 건물 목록 로드
  const loadBuildings = async () => {
    try {
      if (!user) return;
      const data = await buildingApi.getBuildings(user.uid);
      setBuildings(data);
      if (data.length > 0 && !selectedBuilding) {
        setSelectedBuilding(data[0].id);
      }
    } catch (err) {
      setError('건물 목록을 불러오는데 실패했습니다.');
      console.error(err);
    }
  };

  // 임대인 목록 로드
  const loadTenants = async () => {
    if (!selectedBuilding) return;
    
    try {
      setIsLoading(true);
      const data = await tenantApi.getTenants(selectedBuilding);
      setTenants(data);
    } catch (err) {
      setError('임대인 목록을 불러오는데 실패했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBuildings();
  }, [user]);

  useEffect(() => {
    if (selectedBuilding) {
      loadTenants();
    }
  }, [selectedBuilding]);

  // 임대인 추가
  const handleAddTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBuilding) return;

    try {
      const monthlyRent = parseFloat(newTenant.monthlyRent);
      if (isNaN(monthlyRent)) {
        throw new Error('월 임대료는 숫자여야 합니다.');
      }

      await tenantApi.addTenant({
        buildingId: selectedBuilding,
        name: newTenant.name,
        startDate: newTenant.startDate,
        monthlyRent,
        paymentType: newTenant.paymentType,
        contractEndDate: newTenant.contractEndDate || null,
        payments: [],
        createdAt: new Date().toISOString()
      });

      // 폼 초기화
      setNewTenant({
        name: '',
        startDate: '',
        monthlyRent: '',
        paymentType: 'full',
        contractEndDate: ''
      });

      loadTenants();
    } catch (err) {
      setError('임대인 추가에 실패했습니다.');
      console.error(err);
    }
  };

  // 임대인 삭제
  const handleDeleteTenant = async (tenantId: string) => {
    if (!window.confirm('정말 이 임대인을 삭제하시겠습니까?')) return;

    try {
      await tenantApi.deleteTenant(tenantId);
      loadTenants();
    } catch (err) {
      setError('임대인 삭제에 실패했습니다.');
      console.error(err);
    }
  };

  return (
    <ProtectedLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">임대인 관리</h1>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* 건물 선택 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            건물 선택
          </label>
          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="w-full p-2 border rounded"
          >
            {buildings.map((building) => (
              <option key={building.id} value={building.id}>
                {building.name}
              </option>
            ))}
          </select>
        </div>

        {/* 임대인 추가 폼 */}
        <form onSubmit={handleAddTenant} className="mb-8 space-y-4 bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-4">새 임대인 추가</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                임대인 이름
              </label>
              <input
                type="text"
                value={newTenant.name}
                onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                임대 시작일
              </label>
              <input
                type="date"
                value={newTenant.startDate}
                onChange={(e) => setNewTenant({ ...newTenant, startDate: e.target.value })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                월 임대료
              </label>
              <input
                type="number"
                value={newTenant.monthlyRent}
                onChange={(e) => setNewTenant({ ...newTenant, monthlyRent: e.target.value })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                계약 만료일
              </label>
              <input
                type="date"
                value={newTenant.contractEndDate}
                onChange={(e) => setNewTenant({ ...newTenant, contractEndDate: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                결제 방식
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="full"
                    checked={newTenant.paymentType === 'full'}
                    onChange={(e) => setNewTenant({ ...newTenant, paymentType: 'full' })}
                    className="mr-2"
                  />
                  전체 월 임대료
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="prorated"
                    checked={newTenant.paymentType === 'prorated'}
                    onChange={(e) => setNewTenant({ ...newTenant, paymentType: 'prorated' })}
                    className="mr-2"
                  />
                  일할 계산
                </label>
              </div>
            </div>
          </div>
          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            임대인 추가
          </button>
        </form>

        {/* 임대인 목록 */}
        {isLoading ? (
          <div>로딩 중...</div>
        ) : (
          <div className="space-y-4">
            {tenants.map((tenant) => (
              <div
                key={tenant.id}
                className="p-4 border rounded shadow-sm bg-white"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{tenant.name}</h3>
                    <p className="text-sm text-gray-600">
                      임대 시작일: {tenant.startDate}
                    </p>
                    <p className="text-sm text-gray-600">
                      월 임대료: {tenant.monthlyRent.toLocaleString()}원
                    </p>
                    {tenant.contractEndDate && (
                      <p className="text-sm text-gray-600">
                        계약 만료일: {tenant.contractEndDate}
                      </p>
                    )}
                    <p className="text-sm text-gray-600">
                      결제 방식: {tenant.paymentType === 'full' ? '전체 월 ���대료' : '일할 계산'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDeleteTenant(tenant.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
} 