'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { buildingApi } from '@/utils/buildingApi';
import { tenantApi } from '@/utils/tenantApi';
import { reportApi } from '@/utils/reportApi';
import { Building, Tenant } from '@/types';
import ProtectedLayout from '@/components/ProtectedLayout';

export default function ReportsPage() {
  const { user } = useAuth();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [report, setReport] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // 보고서 생성
  const generateReport = async () => {
    if (!selectedTenant) return;
    
    try {
      setIsLoading(true);
      const data = await reportApi.generateTenantReport(selectedTenant);
      setReport(data);
    } catch (err) {
      setError('보고서 생성에 실패했습니다.');
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
      generateReport();
    }
  }, [selectedTenant]);

  // 엑셀 다운로드
  const downloadExcel = () => {
    if (!report.length) return;

    const headers = ['월', '임대료', '납부일', '납부액', '잔액', '비고'];
    const rows = report.map(r => [
      r.month,
      r.rent.toLocaleString(),
      r.paymentDate || '-',
      r.paymentAmount.toLocaleString(),
      r.balance.toLocaleString(),
      r.note || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `임대료_보고서_${selectedTenant}.csv`;
    link.click();
  };

  return (
    <ProtectedLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">임대료 보고서</h1>

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

        {/* 보고서 다운로드 버튼 */}
        <div className="mb-6">
          <button
            onClick={downloadExcel}
            disabled={!report.length}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
          >
            엑셀 다운로드
          </button>
        </div>

        {/* 보고서 테이블 */}
        {isLoading ? (
          <div>보고서 생성 ��...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2">월</th>
                  <th className="px-4 py-2">임대료</th>
                  <th className="px-4 py-2">납부일</th>
                  <th className="px-4 py-2">납부액</th>
                  <th className="px-4 py-2">잔액</th>
                  <th className="px-4 py-2">비고</th>
                </tr>
              </thead>
              <tbody>
                {report.map((row, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-4 py-2">{row.month}</td>
                    <td className="px-4 py-2 text-right">{row.rent.toLocaleString()}원</td>
                    <td className="px-4 py-2">{row.paymentDate || '-'}</td>
                    <td className="px-4 py-2 text-right">{row.paymentAmount.toLocaleString()}원</td>
                    <td className="px-4 py-2 text-right">{row.balance.toLocaleString()}원</td>
                    <td className="px-4 py-2">{row.note || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
} 