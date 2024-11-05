'use client';

import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

interface MonthlyStats {
  month: string;
  expectedRent: number;
  actualPayments: number;
}

export default function MonthlyChart({ data }: { data?: MonthlyStats[] }) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data) return;

    // 이전 차트 인스턴스 제거
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(item => item.month),
        datasets: [
          {
            label: '예상 임대료',
            data: data.map(item => item.expectedRent),
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 1
          },
          {
            label: '실제 납부액',
            data: data.map(item => item.actualPayments),
            backgroundColor: 'rgba(16, 185, 129, 0.5)',
            borderColor: 'rgb(16, 185, 129)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value: number) {
                return value.toLocaleString() + '원';
              }
            }
          }
        },
        plugins: {
          title: {
            display: true,
            text: '월별 임대료 현황'
          }
        }
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <canvas ref={chartRef} />
    </div>
  );
} 