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

  // 새 납부 기록
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

  // 임대인 목록 로드
  const loadTenants = async () => {
    if (!selectedBuilding) return;
    try {
      const data = await tenantApi.getTenants(selectedBuilding);
      setTenants(data);
      if (data.length > 0 && !selectedTenant) {
        setSelectedTenant(data[0].id);
      }
    } catch (err) {
      setError('임대인 목록을 불러오는데 실패했습니다.');
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
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">납부 기록 관리</h1>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* 건물 및 임대인 선택 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              임대인 선택
            </label>
            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="w-full p-2 border rounded"
            >
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 납부 기록 추가 폼 */}
        <form onSubmit={handleAddPayment} className="mb-8 space-y-4 bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-4">새 납부 기록 추가</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                납부일
              </label>
              <input
                type="date"
                value={newPayment.date}
                onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                납부액
              </label>
              <input
                type="number"
                value={newPayment.amount}
                onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            납부 기록 추가
          </button>
        </form>

        {/* 납부 기록 목록 */}
        {isLoading ? (
          <div>로딩 중...</div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="p-4 border rounded shadow-sm bg-white"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">
                      납부일: {payment.date}
                    </p>
                    <p className="text-lg font-semibold">
                      {payment.amount.toLocaleString()}원
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeletePayment(payment.id)}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
} 