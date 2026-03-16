import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { Diario } from '../../types'

interface Props { diarios: Diario[] }

const COLORS = ['#3b82f6', '#f59e0b', '#10b981']

export default function TiposPieChart({ diarios }: Props) {
  const contagem: Record<string, number> = {}
  diarios.forEach(d => { contagem[d.tipo] = (contagem[d.tipo] ?? 0) + 1 })
  const data = Object.entries(contagem).map(([name, value]) => ({ name, value }))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-medium text-gray-700 mb-4">Distribuição por tipo</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
