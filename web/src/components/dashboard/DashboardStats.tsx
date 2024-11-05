export default function DashboardStats({ stats }: { stats: any }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-gray-500 text-sm">총 건물 수</h3>
        <p className="text-2xl font-bold">{stats?.totalBuildings}</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-gray-500 text-sm">총 임대인 수</h3>
        <p className="text-2xl font-bold">{stats?.totalTenants}</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-gray-500 text-sm">이번 달 예상 임대료</h3>
        <p className="text-2xl font-bold">{stats?.totalMonthlyRent?.toLocaleString()}원</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-gray-500 text-sm">총 미납금</h3>
        <p className="text-2xl font-bold text-red-600">{stats?.totalUnpaidRent?.toLocaleString()}원</p>
      </div>
    </div>
  );
} 