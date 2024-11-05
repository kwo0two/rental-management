'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { buildingApi } from '@/utils/buildingApi';
import { tenantApi } from '@/utils/tenantApi';
import { reportApi } from '@/utils/reportApi';
import { Building, Tenant, TenantReport } from '@/types';
import ProtectedLayout from '@/components/ProtectedLayout';
import ReportView from '@/components/ReportView';
import { generateExcel, generatePDF } from '@/utils/reportUtils';

export default function ReportsPage() {
  const { user } = useAuth();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const [selectedBuildingName, setSelectedBuildingName] = useState<string>('');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [selectedTenantName, setSelectedTenantName] = useState<string>('');
  const [report, setReport] = useState<TenantReport[]>([]);
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

  // 건물 선택 핸들러 수정
  const handleBuildingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const buildingId = e.target.value;
    const building = buildings.find(b => b.id === buildingId);
    setSelectedBuilding(buildingId);
    setSelectedBuildingName(building?.name || '');
  };

  // 임차인 선택 핸들러 수정
  const handleTenantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tenantId = e.target.value;
    const tenant = tenants.find(t => t.id === tenantId);
    setSelectedTenant(tenantId);
    setSelectedTenantName(tenant?.name || '');
  };

  // 엑셀 다운로드
  const handleExcelDownload = () => {
    if (!selectedBuildingName || !selectedTenantName) return;
    generateExcel(report, selectedBuildingName, selectedTenantName);
  };

  // PDF 출력
  const handlePrintPDF = () => {
    if (!selectedBuildingName || !selectedTenantName) return;
    generatePDF(report, selectedBuildingName, selectedTenantName);
  };

  return (
    <ProtectedLayout>
      <div className="p-4">
        <div className="mb-4 border-b border-gray-200">
          <h1 className="text-base font-medium text-gray-900 pb-2">임대료 납부현황</h1>
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
                onChange={handleBuildingChange}
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
                onChange={handleTenantChange}
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

        {/* 보고서 차트 */}
        {report.length > 0 && (
          <div className="mt-4 mb-4">
            <ReportView 
              data={report} 
              buildingName={selectedBuildingName}
              tenantName={selectedTenantName}
            />
          </div>
        )}

        {/* 보고서 테이블 */}
        <div className="bg-white border border-gray-200 rounded">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-sm font-medium text-gray-900">납부 현황</h2>
            {report.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={handleExcelDownload}
                  className="px-3 py-1 text-xs text-white bg-green-500 rounded hover:bg-green-600"
                >
                  엑셀 다운로드
                </button>
                <button
                  onClick={handlePrintPDF}
                  className="px-3 py-1 text-xs text-white bg-blue-500 rounded hover:bg-blue-600"
                >
                  PDF 출력
                </button>
              </div>
            )}
          </div>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">월</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">임대료</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">납부일</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">납부액</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">잔액</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">비고</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {report.map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2 text-xs text-gray-900">{row.month}</td>
                      <td className="px-3 py-2 text-xs text-gray-900 text-right">{row.rent.toLocaleString()}원</td>
                      <td className="px-3 py-2 text-xs text-gray-900">{row.paymentDate || '-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-900 text-right">{row.paymentAmount.toLocaleString()}원</td>
                      <td className="px-3 py-2 text-xs text-right">
                        <span className={row.balance > 0 ? 'text-red-600' : 'text-green-600'}>
                          {row.balance.toLocaleString()}원
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">{row.note || ''}</td>
                    </tr>
                  ))}
                  {report.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-sm text-gray-500 text-center">
                        납부 기록이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ProtectedLayout>
  );
} 