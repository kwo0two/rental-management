'use client';

import { useState } from 'react';
import { tenantApi } from '@/utils/tenantApi';
import { Tenant } from '@/types';

interface ContractExtensionProps {
  tenant: Tenant;
  onUpdate: () => void;
}

export default function ContractExtension({ tenant, onUpdate }: ContractExtensionProps) {
  const [extension, setExtension] = useState({
    years: 1,
    applyProrated: false
  });

  const handleExtend = async () => {
    try {
      if (!tenant.contractEndDate) {
        throw new Error('계약 만료일이 설정되지 않은 임차인입니다.');
      }

      await tenantApi.extendContract(tenant.id, {
        years: extension.years,
        applyProrated: extension.applyProrated
      });

      setExtension({
        years: 1,
        applyProrated: false
      });

      onUpdate();
    } catch (error) {
      console.error('계약 연장 실패:', error);
      alert('계약 연장에 실패했습니다.');
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h3 className="text-sm font-medium text-gray-900 mb-4">계약 연장</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-700 mb-1">연장 기간 (년)</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              value={extension.years}
              onChange={(e) => setExtension({ ...extension, years: parseInt(e.target.value) })}
              className="w-24 px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
            <span className="text-sm text-gray-500 self-center">년</span>
          </div>
        </div>

        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={extension.applyProrated}
              onChange={(e) => setExtension({ ...extension, applyProrated: e.target.checked })}
              className="mr-2 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">일할 계산 적용</span>
          </label>
          {extension.applyProrated && (
            <p className="mt-1 text-xs text-gray-500">
              계약 시작일과 만료일에 일할 계산이 적용됩니다.
            </p>
          )}
        </div>

        {tenant.contractEndDate && (
          <div className="text-xs text-gray-500">
            <p>현재 만료일: {tenant.contractEndDate}</p>
            <p>연장 후 만료일: {
              new Date(tenant.contractEndDate).getFullYear() + extension.years + '-' +
              new Date(tenant.contractEndDate).toISOString().slice(5, 10)
            }</p>
          </div>
        )}

        <button
          onClick={handleExtend}
          className="w-full px-4 py-2 text-sm text-white bg-blue-500 rounded hover:bg-blue-600 focus:outline-none"
        >
          계약 연장
        </button>
      </div>
    </div>
  );
} 