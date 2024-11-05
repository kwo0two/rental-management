interface Contract {
  buildingName: string;
  tenantName: string;
  expiryDate: string;
  daysRemaining: number;
}

export default function ExpiringContracts({ contracts }: { contracts?: Contract[] }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-bold mb-4">만료 예정 계약</h2>
      <div className="space-y-4">
        {contracts?.map((contract, index) => (
          <div key={index} className="flex justify-between items-center border-b pb-2">
            <div>
              <p className="font-medium">{contract.buildingName}</p>
              <p className="text-sm text-gray-500">{contract.tenantName}</p>
            </div>
            <div className="text-right">
              <p className="font-medium">{contract.expiryDate}</p>
              <p className={`text-sm ${contract.daysRemaining <= 30 ? 'text-red-500' : 'text-gray-500'}`}>
                {contract.daysRemaining}일 남음
              </p>
            </div>
          </div>
        ))}
        {(!contracts || contracts.length === 0) && (
          <p className="text-gray-500 text-center">만료 예정인 계약이 없습니다.</p>
        )}
      </div>
    </div>
  );
} 