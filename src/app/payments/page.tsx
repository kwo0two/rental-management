'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { buildingApi } from '@/utils/buildingApi';
import { tenantApi } from '@/utils/tenantApi';
import { paymentApi } from '@/utils/paymentApi';
import { Building, Tenant, Payment } from '@/types';
import ProtectedLayout from '@/components/ProtectedLayout';

export default function PaymentsPage() {
  const { user } = useAuth();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newPayment, setNewPayment] = useState({
    date: '',
    amount: '',
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

  // 임차인 목록 로드
  const loadTenants = async () => {
    if (!selectedBuilding) return;
    try {
      const data = await tenantApi.getTenants(selectedBuilding);
      setTenants(data);
      if (data.length > 0 && !selectedTenant) {
        setSelectedTenant(data[0].id);
      }
    } catch (err) {
      setError('임차인 목록을 불러오는데 실패했습니다.');
      console.error(err);
    }
  };

  // 납부 기록 로드
  const loadPayments = async () => {
    if (!selectedTenant) return;
    try {
      setIsLoading(true);
      const data = await paymentApi.getPayments(selectedTenant);
      setPayments(data);
    } catch (err) {
      setError('납부 기록을 불러오는데 실패했습니다.');
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

  useEffect(() => {
    if (selectedTenant) {
      loadPayments();
    }
  }, [selectedTenant]);

  // 납부 기록 추가
  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    try {
      const amount = parseFloat(newPayment.amount);
      if (isNaN(amount)) {
        throw new Error('납부액은 숫자여야 합니다.');
      }

      await paymentApi.addPayment({
        tenantId: selectedTenant,
        date: newPayment.date,
        amount,
        createdAt: new Date().toISOString()
      });

      // 폼 초기화
      setNewPayment({
        date: '',
        amount: '',
      });

      loadPayments();
    } catch (err) {
      setError('납부 기록 추가에 실패했습니다.');
      console.error(err);
    }
  };

  // 납부 기록 삭제
  const handleDeletePayment = async (paymentId: string) => {
    if (!window.confirm('정말 이 납부 기록을 삭제하시겠습니까?')) return;

    try {
      await paymentApi.deletePayment(paymentId);
      loadPayments();
    } catch (err) {
      setError('납부 기록 삭제에 실패했습니다.');
      console.error(err);
    }
  };

  return (
    <ProtectedLayout>
      <div className="p-4">
        <div className="mb-4 border-b border-gray-200">
          <h1 className="text-base font-medium text-gray-900 pb-2">납부 기록</h1>
        </div>

        {error && (
          <div className="mb-4 p-2 bg-red-50 border border-red-200 text-sm text-red-600 rounded">
            {error}
          </div>
        )}

        {/* 건물 및 임차인 선택 */}
        <div className="bg-white border border-gray-200 rounded mb-4">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-sm font-medium text-gray-900">임차인 선택</h2>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-700 mb-1">건물</label>
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
            <div>
              <label className="block text-xs text-gray-700 mb-1">임차인</label>
              <select
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              >
                <option value="">임차인을 선택하세요</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 납부 기록 추가 폼 */}
        <div className="bg-white border border-gray-200 rounded mb-4">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-sm font-medium text-gray-900">새 납부 기록 추가</h2>
          </div>
          <div className="p-4">
            <form onSubmit={handleAddPayment} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-700 mb-1">납부일</label>
                <input
                  type="date"
                  value={newPayment.date}
                  onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })}
                  className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-700 mb-1">납부액</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                    className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    placeholder="금액을 입력하세요"
                    required
                  />
                  <button
                    type="submit"
                    className="px-4 py-1 text-sm text-white bg-blue-500 rounded hover:bg-blue-600 focus:outline-none"
                  >
                    추가
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* 납부 기록 목록 */}
        <div className="bg-white border border-gray-200 rounded">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-sm font-medium text-gray-900">납부 기록 목록</h2>
            <span className="text-xs text-gray-500">총 {payments.length}건</span>
          </div>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {payments.map((payment) => (
                <div key={payment.id} className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-500">납부일: {payment.date}</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        {payment.amount.toLocaleString()}원
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeletePayment(payment.id)}
                      className="px-3 py-1 text-xs text-white bg-red-500 rounded hover:bg-red-600"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
              {payments.length === 0 && (
                <div className="p-4 text-sm text-gray-500 text-center">
                  등록된 납부 기록이 없습니다.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedLayout>
  );
} 