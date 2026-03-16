import { useDiarios } from '../hooks/useDiarios'
import StatsCard from '../components/dashboard/StatsCard'
import PaginasPorMesChart from '../components/dashboard/PaginasPorMesChart'
import TiposPieChart from '../components/dashboard/TiposPieChart'
import Spinner from '../components/common/Spinner'

export default function DashboardPage() {
  const { diarios, total, loading, error } = useDiarios()

  if (loading) return <Spinner />
  if (error)   return <p className="text-red-500 text-sm">{error}</p>

  const ok         = diarios.filter(d => d.status === 'ok')
  const comErro    = diarios.filter(d => d.status === 'error')
  const totalPags  = ok.reduce((s, d) => s + (d.paginas ?? 0), 0)
  const mediaPags  = ok.length ? (totalPags / ok.length).toFixed(1) : '—'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Visão geral dos Diários Oficiais indexados</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Total de edições"   value={total.toLocaleString('pt-BR')}            color="blue" />
        <StatsCard label="Total de páginas"   value={totalPags.toLocaleString('pt-BR')}        color="green" />
        <StatsCard label="Média págs/edição"  value={mediaPags}                                color="gray" />
        <StatsCard label="Erros de leitura"   value={comErro.length} sub="PDFs não processados" color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PaginasPorMesChart diarios={diarios} />
        <TiposPieChart      diarios={diarios} />
      </div>
    </div>
  )
}
