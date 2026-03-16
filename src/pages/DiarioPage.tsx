import { useState } from 'react'
import { useDiarios } from '../hooks/useDiarios'
import StatusBadge from '../components/common/StatusBadge'
import Spinner from '../components/common/Spinner'
import { ExternalLink, Search } from 'lucide-react'

export default function DiarioPage() {
  const { diarios, total, loading, error } = useDiarios()
  const [busca, setBusca] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('')

  if (loading) return <Spinner />
  if (error)   return <p className="text-red-500 text-sm">{error}</p>

  const tipos = [...new Set(diarios.map(d => d.tipo))]

  const filtrados = diarios.filter(d => {
    const matchBusca = busca === '' ||
      d.edicao.includes(busca) ||
      d.data_edicao.includes(busca) ||
      d.tipo.toLowerCase().includes(busca.toLowerCase())
    const matchTipo = tipoFiltro === '' || d.tipo === tipoFiltro
    return matchBusca && matchTipo
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Diários Oficiais</h1>
          <p className="text-sm text-gray-500 mt-1">{total} edições indexadas</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por edição, data ou tipo..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <select
          value={tipoFiltro}
          onChange={e => setTipoFiltro(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">Todos os tipos</option>
          {tipos.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Edição</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Data</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Tipo</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Páginas</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.map(d => (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">#{d.edicao}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(d.data_edicao).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{d.tipo}</td>
                  <td className="px-4 py-3 text-right text-gray-800 font-medium">
                    {d.paginas?.toLocaleString('pt-BR') ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
                    >
                      <ExternalLink size={13} /> Abrir
                    </a>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                    Nenhum resultado encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
          Exibindo {filtrados.length} de {total} registros
        </div>
      </div>
    </div>
  )
}
