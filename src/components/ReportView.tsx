'use client';

import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { TenantReport } from '@/types';
import { generateChartConfig } from '@/utils/reportUtils';

interface ReportViewProps {
  data: TenantReport[];
  buildingName: string;
  tenantName: string;
}

export default function ReportView({ data, buildingName, tenantName }: ReportViewProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data.length) return;

    // 이전 차트 인스턴스 제거
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // 차트 설정 가져오기
    const config = generateChartConfig(data);
    config.options = {
      ...config.options,
      plugins: {
        ...config.options.plugins,
        title: {
          ...config.options.plugins.title,
          text: `${buildingName} - ${tenantName} 임대료 납부현황`
        }
      }
    };

    chartInstance.current = new Chart(ctx, config);

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, buildingName, tenantName]);

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="h-[400px]">
        <canvas ref={chartRef}></canvas>
      </div>
    </div>
  );
} 