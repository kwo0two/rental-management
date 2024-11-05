import { TenantReport } from '@/types';
import { Chart } from 'chart.js/auto';

export const generateExcel = (reportData: TenantReport[], buildingName: string, tenantName: string) => {
  const headers = ['월', '임대료', '납부일', '납부액', '잔액', '비고'];
  const rows = reportData.map(r => [
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

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `임대료_보고서_${buildingName}_${tenantName}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
};

export const generatePDF = async (reportData: TenantReport[], buildingName: string, tenantName: string) => {
  const html = `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap');
          body { 
            font-family: 'Noto Sans KR', sans-serif;
            padding: 20px;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px;
          }
          th, td { 
            border: 1px solid #e2e8f0; 
            padding: 8px; 
            text-align: right;
            font-size: 12px;
          }
          th { 
            background-color: #f8fafc;
            font-weight: 500;
          }
          .title { 
            text-align: center; 
            font-size: 18px; 
            font-weight: 700;
            margin-bottom: 20px;
            color: #1a202c;
          }
          .date {
            text-align: right;
            font-size: 12px;
            color: #64748b;
            margin-bottom: 10px;
          }
          .balance-positive { color: #ef4444; }
          .balance-negative { color: #22c55e; }
        </style>
      </head>
      <body>
        <div class="title">${buildingName} - ${tenantName} 임대료 납부현황</div>
        <div class="date">출력일: ${new Date().toLocaleDateString()}</div>
        <table>
          <thead>
            <tr>
              <th>월</th>
              <th>임대료</th>
              <th>납부일</th>
              <th>납부액</th>
              <th>잔액</th>
              <th>비고</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.map(row => `
              <tr>
                <td>${row.month}</td>
                <td>${row.rent.toLocaleString()}원</td>
                <td style="text-align: center">${row.paymentDate || '-'}</td>
                <td>${row.paymentAmount.toLocaleString()}원</td>
                <td class="${row.balance > 0 ? 'balance-positive' : 'balance-negative'}">
                  ${row.balance.toLocaleString()}원
                </td>
                <td style="text-align: left">${row.note || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }
};

export const generateChartConfig = (data: TenantReport[]) => {
  return {
    type: 'line' as const,
    data: {
      labels: data.map(item => item.month),
      datasets: [
        {
          label: '임대료',
          data: data.map(item => item.rent),
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.1)',
          tension: 0.1,
          pointStyle: 'circle',
          pointRadius: 4,
          pointHoverRadius: 6,
          order: 2
        },
        {
          label: '납부액',
          data: data.map(item => item.paymentAmount),
          borderColor: '#2ecc71',
          backgroundColor: 'rgba(46, 204, 113, 0.1)',
          tension: 0.1,
          pointStyle: 'circle',
          pointRadius: 4,
          pointHoverRadius: 6,
          order: 1
        },
        {
          label: '잔액',
          data: data.map(item => item.balance),
          borderColor: '#e74c3c',
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
          tension: 0.1,
          pointStyle: 'circle',
          pointRadius: 4,
          pointHoverRadius: 6,
          order: 3,
          yAxisID: 'balance'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      plugins: {
        title: {
          display: true,
          text: '임대료 납부 현황',
          font: {
            size: 16,
            weight: '500'
          },
          padding: 20
        },
        legend: {
          position: 'top' as const,
          align: 'center' as const,
          labels: {
            usePointStyle: true,
            padding: 15,
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          titleColor: '#1a202c',
          bodyColor: '#4a5568',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          padding: 10,
          bodyFont: {
            size: 12
          },
          titleFont: {
            size: 12,
            weight: '600'
          },
          callbacks: {
            label: function(context: any) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += new Intl.NumberFormat('ko-KR', {
                  style: 'currency',
                  currency: 'KRW'
                }).format(context.parsed.y);
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: {
              size: 11
            }
          }
        },
        y: {
          position: 'left',
          beginAtZero: true,
          grid: {
            color: '#f1f5f9'
          },
          ticks: {
            font: {
              size: 11
            },
            callback: function(value: any) {
              return new Intl.NumberFormat('ko-KR', {
                style: 'currency',
                currency: 'KRW',
                maximumFractionDigits: 0
              }).format(value);
            }
          }
        },
        balance: {
          position: 'right',
          beginAtZero: true,
          grid: {
            display: false
          },
          ticks: {
            font: {
              size: 11
            },
            callback: function(value: any) {
              return new Intl.NumberFormat('ko-KR', {
                style: 'currency',
                currency: 'KRW',
                maximumFractionDigits: 0
              }).format(value);
            }
          }
        }
      }
    }
  };
}; 