'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { buildingApi } from '@/utils/buildingApi';
import { tenantApi } from '@/utils/tenantApi';
import { Building, Tenant } from '@/types';
import ProtectedLayout from '@/components/ProtectedLayout';
import RentModification from '@/components/RentModification';
import ContractExtension from '@/components/ContractExtension';

interface NewTenantForm {
  name: string;
  startDate: string;
  monthlyRent: string;
  paymentType: 'full' | 'prorated';
  contractEndDate: string;
}

export default function TenantsPage() {
  const { user } = useAuth();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newTenant, setNewTenant] = useState<NewTenantForm>({
    name: '',
    startDate: '',
    monthlyRent: '',
    paymentType: 'full',
    contractEndDate: ''
  });

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

  const loadTenants = async () => {
    if (!selectedBuilding) return;
    
    try {
      setIsLoading(true);
      const data = await tenantApi.getTenants(selectedBuilding);
      setTenants(data);
    } catch (err) {
      setError('임차인 목록을 불러오는데 실패했습니다.');
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

  const handleAddTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBuilding) return;

    try {
      const monthlyRent = parseFloat(newTenant.monthlyRent);
      if (isNaN(monthlyRent)) {
        throw new Error('월 임차료는 숫자여야 합니다.');
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

      setNewTenant({
        name: '',
        startDate: '',
        monthlyRent: '',
        paymentType: 'full',
        contractEndDate: ''
      });

      loadTenants();
    } catch (err) {
      setError('임차인 추가에 실패했습니다.');
      console.error(err);
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    if (!window.confirm('정말 이 임차인을 삭제하시겠습니까?')) return;

    try {
      await tenantApi.deleteTenant(tenantId);
      loadTenants();
    } catch (err) {
      setError('임차인 삭제에 실패했습니다.');
      console.error(err);
    }
  };

  return (
    <ProtectedLayout>
      <div className="p-4">
        <div className="mb-4 border-b border-gray-200">
          <h1 className="text-base font-medium text-gray-900 pb-2">임차인 관리</h1>
        </div>

        {error && (
          <div className="mb-4 p-2 bg-red-50 border border-red-200 text-sm text-red-600 rounded">
            {error}
          </div>
        )}

        {/* 건물 선택 */}
        <div className="bg-white border border-gray-200 rounded mb-4">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-sm font-medium text-gray-900">건물 선택</h2>
          </div>
          <div className="p-4">
            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="">건물을 선택하세요</option>
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 임차인 추가 폼 */}
        <div className="bg-white border border-gray-200 rounded mb-4">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-sm font-medium text-gray-900">새 임차인 추가</h2>
          </div>
          <div className="p-4">
            <form onSubmit={handleAddTenant} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-700 mb-1">임차인 이름</label>
                  <input
                    type="text"
                    value={newTenant.name}
                    onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                    className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-700 mb-1">임차 시작일</label>
                  <input
                    type="date"
                    value={newTenant.startDate}
                    onChange={(e) => setNewTenant({ ...newTenant, startDate: e.target.value })}
                    className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-700 mb-1">월 임차료</label>
                  <input
                    type="number"
                    value={newTenant.monthlyRent}
                    onChange={(e) => setNewTenant({ ...newTenant, monthlyRent: e.target.value })}
                    className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-700 mb-1">계약 만료일</label>
                  <input
                    type="date"
                    value={newTenant.contractEndDate}
                    onChange={(e) => setNewTenant({ ...newTenant, contractEndDate: e.target.value })}
                    className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-700 mb-1">결제 방식</label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="full"
                      checked={newTenant.paymentType === 'full'}
                      onChange={(e) => setNewTenant({ ...newTenant, paymentType: 'full' })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">전체 월 임차료</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="prorated"
                      checked={newTenant.paymentType === 'prorated'}
                      onChange={(e) => setNewTenant({ ...newTenant, paymentType: 'prorated' })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">일할 계산</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-1 text-sm text-white bg-blue-500 rounded hover:bg-blue-600 focus:outline-none"
                >
                  추가
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* 임차인 목록 */}
        <div className="bg-white border border-gray-200 rounded">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-sm font-medium text-gray-900">임차인 목록</h2>
            <span className="text-xs text-gray-500">총 {tenants.length}명</span>
          </div>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {tenants.map((tenant) => (
                <div key={tenant.id} className="p-4">
                  <div className="flex flex-col space-y-4">
                    {/* 임차인 정보 */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{tenant.name}</h3>
                        <div className="mt-1 space-y-1">
                          <p className="text-xs text-gray-500">임차 시작일: {tenant.startDate}</p>
                          <p className="text-xs text-gray-500">월 임차료: {tenant.monthlyRent.toLocaleString()}원</p>
                          <p className="text-xs text-gray-500">
                            결제 방식: {tenant.paymentType === 'full' ? '전체 월 임차료' : '일할 계산'}
                          </p>
                          {tenant.contractEndDate && (
                            <p className="text-xs text-gray-500">계약 만료일: {tenant.contractEndDate}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteTenant(tenant.id)}
                        className="px-3 py-1 text-xs text-white bg-red-500 rounded hover:bg-red-600"
                      >
                        삭제
                      </button>
                    </div>

                    {/* 임대료 수정 및 계약 연장 컴포넌트 */}
                    <div className="grid grid-cols-2 gap-4">
                      <RentModification 
                        tenant={tenant} 
                        onUpdate={loadTenants} 
                      />
                      <ContractExtension 
                        tenant={tenant} 
                        onUpdate={loadTenants} 
                      />
                    </div>
                  </div>
                </div>
              ))}
              {tenants.length === 0 && (
                <div className="p-4 text-sm text-gray-500 text-center">
                  등록된 임차인이 없습니다.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedLayout>
  );
} 