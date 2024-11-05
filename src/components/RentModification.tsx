'use client';

import { useState } from 'react';
import { tenantApi } from '@/utils/tenantApi';
import { Tenant } from '@/types';

interface RentModificationProps {
  tenant: Tenant;
  onUpdate: () => void;
}

export default function RentModification({ tenant, onUpdate }: RentModificationProps) {
  const [rentOverride, setRentOverride] = useState({
    date: '',
    amount: '',
    note: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const amount = parseFloat(rentOverride.amount);
      if (isNaN(amount)) {
        throw new Error('임대료는 숫자여야 합니다.');
      }

      await tenantApi.updateMonthlyRent(tenant.id, {
        date: rentOverride.date,
        amount,
        note: rentOverride.note
      });
      
      setRentOverride({
        date: '',
        amount: '',
        note: ''
      });
      
      onUpdate();
    } catch (error) {
      console.error('임대료 수정 실패:', error);
      alert('임대료 수정에 실패했습니다.');
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h3 className="text-sm font-medium text-gray-900 mb-4">임대료 수정</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-gray-700 mb-1">적용 월</label>
          <input
            type="month"
            value={rentOverride.date}
            onChange={(e) => setRentOverride({ ...rentOverride, date: e.target.value })}
            className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-xs text-gray-700 mb-1">수정 임대료</label>
          <input
            type="number"
            value={rentOverride.amount}
            onChange={(e) => setRentOverride({ ...rentOverride, amount: e.target.value })}
            className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-xs text-gray-700 mb-1">수정 사유</label>
          <input
            type="text"
            value={rentOverride.note}
            onChange={(e) => setRentOverride({ ...rentOverride, note: e.target.value })}
            className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            placeholder="예: 임대료 인상"
          />
        </div>

        {/* 수정 내역 표시 */}
        {tenant.monthlyRentOverrides && Object.entries(tenant.monthlyRentOverrides).length > 0 && (
          <div className="mt-4">
            <h4 className="text-xs font-medium text-gray-700 mb-2">수정 내역</h4>
            <div className="space-y-2">
              {Object.entries(tenant.monthlyRentOverrides).map(([date, override]) => (
                <div key={date} className="text-xs text-gray-600">
                  {date}: {typeof override === 'number' ? override : override.amount}원
                  {typeof override === 'object' && override.note && ` (${override.note})`}
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          className="w-full px-4 py-2 text-sm text-white bg-blue-500 rounded hover:bg-blue-600 focus:outline-none"
        >
          임대료 수정
        </button>
      </form>
    </div>
  );
} 