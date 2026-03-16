import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { Diario } from '../../types'

interface Props { diarios: Diario[] }

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export default function PaginasPorMesChart({ diarios }: Props) {
  const data = MESES.map((mes, i) => ({
    mes,
    paginas: diarios
      .filter(d => new Date(d.data_edicao).getMonth() === i && d.paginas)
      .reduce((sum, d) => sum + (d.paginas ?? 0), 0),
    edicoes: diarios.filter(d => new Date(d.data_edicao).getMonth() === i).length,
  }))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-medium text-gray-700 mb-4">Páginas publicadas por mês</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barSize={24}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(v: number, name: string) =>
              [v.toLocaleString('pt-BR'), name === 'paginas' ? 'Páginas' : 'Edições']
            }
          />
          <Bar dataKey="paginas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
