interface Props {
  label: string
  value: string | number
  sub?:  string
  color?: 'blue' | 'green' | 'red' | 'gray'
}

const colors = {
  blue:  'bg-blue-50  text-blue-700',
  green: 'bg-green-50 text-green-700',
  red:   'bg-red-50   text-red-700',
  gray:  'bg-gray-50  text-gray-700',
}

export default function StatsCard({ label, value, sub, color = 'gray' }: Props) {
  return (
    <div className={`rounded-xl p-5 ${colors[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  )
}
