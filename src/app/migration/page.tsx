'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { migrationApi } from '@/utils/migrationApi';
import ProtectedLayout from '@/components/ProtectedLayout';

export default function MigrationPage() {
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);

    const file = event.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        try {
          setIsLoading(true);
          const jsonData = JSON.parse(event.target?.result as string);
          await migrationApi.importData(user.uid, jsonData);
          setSuccess('데이터 가져오기가 완료되었습니다.');
        } catch (err) {
          setError('데이터 가져오기에 실패했습니다.');
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleExport = async () => {
    if (!user) return;

    try {
      setError(null);
      setSuccess(null);
      setIsLoading(true);

      const data = await migrationApi.exportData(user.uid);
      
      // JSON 파일 다운로드
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rental-data.json';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess('데이터 내보내기가 완료되었습니다.');
    } catch (err) {
      setError('데이터 내보내기에 실패했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">데이터 마이그레이션</h1>

        {/* 상태 메시지 */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {/* 데이터 가져오기 */}
        <div className="mb-8 p-6 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">데이터 가져오기</h2>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              disabled={isLoading}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </div>
        </div>

        {/* 데이터 내보내기 */}
        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">데이터 내보내기</h2>
          <button
            onClick={handleExport}
            disabled={isLoading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
          >
            {isLoading ? '처리 중...' : '데이터 내보내기'}
          </button>
        </div>
      </div>
    </ProtectedLayout>
  );
} 