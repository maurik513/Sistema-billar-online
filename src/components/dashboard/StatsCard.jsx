const colorMap = {
  green: { bg: 'bg-green-900/30', text: 'text-green-400', icon: 'text-green-400' },
  blue: { bg: 'bg-blue-900/30', text: 'text-blue-400', icon: 'text-blue-400' },
  purple: { bg: 'bg-purple-900/30', text: 'text-purple-400', icon: 'text-purple-400' },
  red: { bg: 'bg-red-900/30', text: 'text-red-400', icon: 'text-red-400' },
  yellow: { bg: 'bg-yellow-900/30', text: 'text-yellow-400', icon: 'text-yellow-400' },
};

export default function StatsCard({ icon: Icon, label, value, color = 'green' }) {
  const c = colorMap[color] || colorMap.green;
  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.bg}`}>
          <Icon size={20} className={c.icon} />
        </div>
        <div>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
          <div className={`text-xl font-bold ${c.text}`}>{value}</div>
        </div>
      </div>
    </div>
  );
}
