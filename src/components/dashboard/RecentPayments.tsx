interface Payment {
  buildingName: string;
  tenantName: string;
  amount: number;
  date: string;
}

export default function RecentPayments({ payments }: { payments?: Payment[] }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-bold mb-4">최근 납부 기록</h2>
      <div className="space-y-4">
        {payments?.map((payment, index) => (
          <div key={index} className="flex justify-between items-center border-b pb-2">
            <div>
              <p className="font-medium">{payment.buildingName}</p>
              <p className="text-sm text-gray-500">{payment.tenantName}</p>
            </div>
            <div className="text-right">
              <p className="font-medium">{payment.amount.toLocaleString()}원</p>
              <p className="text-sm text-gray-500">{payment.date}</p>
            </div>
          </div>
        ))}
        {(!payments || payments.length === 0) && (
          <p className="text-gray-500 text-center">최근 납부 기록이 없습니다.</p>
        )}
      </div>
    </div>
  );
} 