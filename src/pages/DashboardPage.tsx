import { useEffect, useState } from 'react'
import { useDiarios } from '../hooks/useDiarios'
import StatsCard from '../components/dashboard/StatsCard'
import PaginasPorMesChart from '../components/dashboard/PaginasPorMesChart'
import TiposPieChart from '../components/dashboard/TiposPieChart'
import Spinner from '../components/common/Spinner'

export default function DashboardPage() {
  const { diarios, loading, error } = useDiarios()
  const [anoFiltro, setAnoFiltro] = useState<string>('')

  const anosDisponiveis = [...new Set(diarios.map(d => new Date(d.data_edicao).getFullYear()))]
    .sort((a, b) => b - a)

  useEffect(() => {
    if (!anoFiltro && anosDisponiveis.length > 0) {
      setAnoFiltro(String(anosDisponiveis[0]))
    }
  }, [anoFiltro, anosDisponiveis])

  const diariosFiltrados = anoFiltro === ''
    ? diarios
    : diarios.filter(d => String(new Date(d.data_edicao).getFullYear()) === anoFiltro)

  const ok         = diariosFiltrados.filter(d => d.status === 'ok')
  const comErro    = diariosFiltrados.filter(d => d.status === 'error')
  const totalPags  = ok.reduce((s, d) => s + (d.paginas ?? 0), 0)
  const mediaPags  = ok.length ? (totalPags / ok.length).toFixed(1) : '—'
  const totalExibido = diariosFiltrados.length

  if (loading) return <Spinner />
  if (error)   return <p className="text-red-500 text-sm">{error}</p>

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Visão geral dos Diários Oficiais indexados
            {anoFiltro ? ` em ${anoFiltro}` : ''}
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Ano</label>
          <select
            value={anoFiltro}
            onChange={e => setAnoFiltro(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {anosDisponiveis.map(a => <option key={a} value={String(a)}>{a}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Total de edições"   value={totalExibido.toLocaleString('pt-BR')}     color="blue" />
        <StatsCard label="Total de páginas"   value={totalPags.toLocaleString('pt-BR')}        color="green" />
        <StatsCard label="Média págs/edição"  value={mediaPags}                                color="gray" />
        <StatsCard label="Erros de leitura"   value={comErro.length} sub="PDFs não processados" color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PaginasPorMesChart diarios={diariosFiltrados} />
        <TiposPieChart      diarios={diariosFiltrados} />
      </div>
    </div>
  )
}
