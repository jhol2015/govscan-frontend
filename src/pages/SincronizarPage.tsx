import { useState, useEffect, useRef } from 'react'
import { diarioService } from '../services/diarioService'
import type { Diario, SincronizarResponse } from '../types'
import { RefreshCw, CheckCircle, XCircle, Download, FileWarning } from 'lucide-react'

type SyncProgress = {
  total: number
  ok: number
  error: number
  pending: number
  progress: number
}

type SyncFailure = {
  id: number
  portal: string
  municipio: string
  data_edicao: string
  nome_arquivo: string
  url: string
  erro: string
}

type SyncLogEntry = {
  id: string
  portal: string
  ano: number
  startedAt: string
  finishedAt?: string
  status: 'running' | 'success' | 'partial' | 'failed'
  progress: SyncProgress
  failures: SyncFailure[]
  message?: string
}

type RetrySummary = {
  mode: 'selected' | 'batch'
  attempted: number
  recovered: number
  remaining: number
  beforeErrors: number
  afterErrors: number
  recordedAt: string
}

type RetryTone = {
  container: string
  border: string
  title: string
  badge: string
  label: string
}

const SYNC_LOGS_KEY = 'govscan.sync.logs'
const POLLING_INTERVAL_MS = 2000
const PAGE_LIMIT = 200

export default function SincronizarPage() {
  const [portais, setPortais]     = useState<string[]>([])
  const [portal, setPortal]       = useState('')
  const [ano, setAno]             = useState(new Date().getFullYear())
  const [loading, setLoading]     = useState(false)
  const [resultado, setResultado] = useState<SincronizarResponse | null>(null)
  const [erro, setErro]           = useState<string | null>(null)
  const [progress, setProgress]   = useState<SyncProgress>({ total: 0, ok: 0, error: 0, pending: 0, progress: 0 })
  const [pendentes, setPendentes] = useState<Diario[]>([])
  const [falhas, setFalhas]       = useState<SyncFailure[]>([])
  const [logs, setLogs]           = useState<SyncLogEntry[]>([])
  const [activeLogId, setActiveLogId] = useState<string | null>(null)
  const [reprocessandoFalhas, setReprocessandoFalhas] = useState(false)
  const [reprocessandoLote, setReprocessandoLote] = useState(false)
  const [retrySummary, setRetrySummary] = useState<RetrySummary | null>(null)
  const pollingRef = useRef<number | null>(null)

  function getRetryTone(summary: RetrySummary): RetryTone {
    if (summary.attempted === 0 || summary.beforeErrors === 0) {
      return {
        container: 'bg-blue-50',
        border: 'border-blue-200',
        title: 'text-blue-800',
        badge: 'bg-blue-100 text-blue-800',
        label: 'Sem falhas para reprocessar',
      }
    }

    if (summary.afterErrors === 0) {
      return {
        container: 'bg-green-50',
        border: 'border-green-200',
        title: 'text-green-800',
        badge: 'bg-green-100 text-green-800',
        label: 'Sucesso total',
      }
    }

    if (summary.recovered > 0) {
      return {
        container: 'bg-amber-50',
        border: 'border-amber-200',
        title: 'text-amber-800',
        badge: 'bg-amber-100 text-amber-800',
        label: 'Melhoria parcial',
      }
    }

    return {
      container: 'bg-red-50',
      border: 'border-red-200',
      title: 'text-red-800',
      badge: 'bg-red-100 text-red-800',
      label: 'Sem melhoria',
    }
  }

  useEffect(() => {
    diarioService.listarPortais().then(p => {
      setPortais(p)
      if (p.length) setPortal(p[0])
    })
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SYNC_LOGS_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as SyncLogEntry[]
      if (Array.isArray(parsed)) setLogs(parsed)
    } catch {
      // Ignora log inválido no navegador
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(SYNC_LOGS_KEY, JSON.stringify(logs.slice(0, 20)))
  }, [logs])

  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [])

  function extractYear(value: string): number | null {
    const firstToken = value.split('T')[0] ?? value
    const [year] = firstToken.split('-')
    const parsed = Number(year)
    return Number.isNaN(parsed) ? null : parsed
  }

  async function carregarDiariosDoPortalAno(portalAtual: string, anoAtual: number): Promise<Diario[]> {
    let skip = 0
    let total = Number.POSITIVE_INFINITY
    const all: Diario[] = []

    while (skip < total) {
      const page = await diarioService.listar(portalAtual, skip, PAGE_LIMIT)
      total = page.total
      all.push(...page.items)
      skip += PAGE_LIMIT
      if (page.items.length === 0) break
    }

    return all.filter(item => extractYear(item.data_edicao) === anoAtual)
  }

  function buildFailures(items: Diario[]): SyncFailure[] {
    return items
      .filter(item => item.status === 'error')
      .map(item => ({
        id: item.id,
        portal: item.portal,
        municipio: item.municipio,
        data_edicao: item.data_edicao,
        nome_arquivo: item.nome_arquivo,
        url: item.url,
        erro: item.erro ?? 'Erro não informado pelo backend',
      }))
  }

  function stopPolling() {
    if (pollingRef.current !== null) {
      window.clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  function updateLog(logId: string, updater: (current: SyncLogEntry) => SyncLogEntry) {
    setLogs(prev => prev.map(entry => (entry.id === logId ? updater(entry) : entry)))
  }

  async function updateProgressSnapshot(portalAtual: string, anoAtual: number, logId?: string) {
    const diarios = await carregarDiariosDoPortalAno(portalAtual, anoAtual)
    const pendingItems = diarios.filter(item => item.status === 'pending')
    const okCount = diarios.filter(item => item.status === 'ok').length
    const errorCount = diarios.filter(item => item.status === 'error').length
    const totalCount = diarios.length
    const doneCount = okCount + errorCount
    const progressValue = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

    const nextProgress: SyncProgress = {
      total: totalCount,
      ok: okCount,
      error: errorCount,
      pending: pendingItems.length,
      progress: progressValue,
    }

    const failures = buildFailures(diarios)
    setProgress(nextProgress)
    setPendentes(pendingItems.slice(0, 8))
    setFalhas(failures)

    if (logId) {
      updateLog(logId, current => ({
        ...current,
        progress: nextProgress,
        failures,
      }))
    }

    return {
      progress: nextProgress,
      failures,
    }
  }

  function startPolling(portalAtual: string, anoAtual: number, logId: string) {
    stopPolling()
    pollingRef.current = window.setInterval(() => {
      void updateProgressSnapshot(portalAtual, anoAtual, logId)
    }, POLLING_INTERVAL_MS)
  }

  function buildLogFileContent(logEntry: SyncLogEntry): string {
    return JSON.stringify(logEntry, null, 2)
  }

  function buildFailureCsv(rows: SyncFailure[]): string {
    const header = ['id', 'portal', 'municipio', 'data_edicao', 'nome_arquivo', 'url', 'erro']
    const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`
    const body = rows.map(row => [
      row.id,
      row.portal,
      row.municipio,
      row.data_edicao,
      row.nome_arquivo,
      row.url,
      row.erro,
    ].map(escape).join(','))
    return [header.join(','), ...body].join('\n')
  }

  function triggerDownload(filename: string, content: string, contentType: string) {
    const blob = new Blob([content], { type: contentType })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  function baixarPacoteRecuperacao(logEntry?: SyncLogEntry) {
    if (falhas.length > 0) {
      triggerDownload(
        `govscan-falhas-${portal}-${ano}.csv`,
        buildFailureCsv(falhas),
        'text/csv;charset=utf-8;'
      )
    }

    if (logEntry) {
      triggerDownload(
        `govscan-log-${logEntry.portal}-${logEntry.ano}-${logEntry.id}.json`,
        buildLogFileContent(logEntry),
        'application/json;charset=utf-8;'
      )
    }
  }

  async function handleReprocessarFalhas() {
    if (!portal || falhas.length === 0 || reprocessandoFalhas || loading) return

    setReprocessandoFalhas(true)
    setErro(null)
    setResultado(null)
    const beforeErrors = falhas.length

    const idsFalhas = falhas.map(item => item.id)

    try {
      const res = await diarioService.reprocessarFalhas(idsFalhas)
      setResultado(res)
      const snapshot = await updateProgressSnapshot(portal, ano, activeLogId ?? undefined)
      const afterErrors = snapshot.failures.length
      const recovered = Math.max(0, beforeErrors - afterErrors)
      setRetrySummary({
        mode: 'selected',
        attempted: idsFalhas.length,
        recovered,
        remaining: afterErrors,
        beforeErrors,
        afterErrors,
        recordedAt: new Date().toISOString(),
      })

      if (activeLogId) {
        updateLog(activeLogId, current => ({
          ...current,
          message: `Reprocessamento de ${idsFalhas.length} falha(s) executado.`,
        }))
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'UNKNOWN_RETRY_ERROR'
      if (reason === 'RETRY_NOT_SUPPORTED') {
        const activeLog = activeLogId ? logs.find(item => item.id === activeLogId) : undefined
        baixarPacoteRecuperacao(activeLog)
        setErro('O backend ainda não suporta reprocessamento seletivo. Baixei o pacote de recuperação (CSV/JSON) para você reprocessar depois.')
        setRetrySummary({
          mode: 'selected',
          attempted: idsFalhas.length,
          recovered: 0,
          remaining: beforeErrors,
          beforeErrors,
          afterErrors: beforeErrors,
          recordedAt: new Date().toISOString(),
        })
      } else {
        setErro('Falha ao reprocessar itens com erro. Verifique os logs e tente novamente.')
      }
    } finally {
      setReprocessandoFalhas(false)
    }
  }

  async function handleReprocessarLotePortalAno() {
    if (!portal || loading || reprocessandoFalhas || reprocessandoLote) return

    setReprocessandoLote(true)
    setErro(null)
    setResultado(null)

    const logId = `${portal}-${ano}-retry-batch-${Date.now()}`
    const batchLog: SyncLogEntry = {
      id: logId,
      portal,
      ano,
      startedAt: new Date().toISOString(),
      status: 'running',
      progress: { total: 0, ok: 0, error: 0, pending: 0, progress: 0 },
      failures: [],
      message: 'Reprocessamento em lote iniciado para portal/ano.',
    }
    setActiveLogId(logId)
    setLogs(prev => [batchLog, ...prev].slice(0, 20))

    let beforeErrors = 0

    try {
      const beforeSnapshot = await updateProgressSnapshot(portal, ano, logId)
      beforeErrors = beforeSnapshot.failures.length

      const res = await diarioService.reprocessarFalhasPorPortalAno(portal, ano)
      setResultado(res)
      const afterSnapshot = await updateProgressSnapshot(portal, ano, logId)
      const afterErrors = afterSnapshot.failures.length
      const recovered = Math.max(0, beforeErrors - afterErrors)
      setRetrySummary({
        mode: 'batch',
        attempted: beforeErrors,
        recovered,
        remaining: afterErrors,
        beforeErrors,
        afterErrors,
        recordedAt: new Date().toISOString(),
      })

      updateLog(logId, current => ({
        ...current,
        finishedAt: new Date().toISOString(),
        status: current.failures.length > 0 ? 'partial' : 'success',
        message: `Reprocessamento em lote finalizado. Salvos: ${res.salvos} • Erros: ${res.erros}`,
      }))
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'UNKNOWN_RETRY_ERROR'
      const afterSnapshot = await updateProgressSnapshot(portal, ano, logId)
      const afterErrors = afterSnapshot.failures.length
      setRetrySummary({
        mode: 'batch',
        attempted: beforeErrors,
        recovered: Math.max(0, beforeErrors - afterErrors),
        remaining: afterErrors,
        beforeErrors,
        afterErrors,
        recordedAt: new Date().toISOString(),
      })

      if (reason === 'RETRY_NOT_SUPPORTED') {
        baixarPacoteRecuperacao(batchLog)
        setErro('O backend não suporta reprocessamento em lote por API. Baixei o pacote de recuperação (CSV/JSON).')
      } else {
        setErro('Falha ao reprocessar falhas do portal/ano selecionado.')
      }

      updateLog(logId, current => ({
        ...current,
        finishedAt: new Date().toISOString(),
        status: 'failed',
        message: reason === 'RETRY_NOT_SUPPORTED'
          ? 'Backend sem endpoint de reprocessamento em lote. Pacote de recuperação exportado.'
          : 'Falha no reprocessamento em lote por portal/ano.',
      }))
    } finally {
      setReprocessandoLote(false)
    }
  }

  async function handleSincronizar() {
    if (!portal) return

    const logId = `${portal}-${ano}-${Date.now()}`
    const initialLog: SyncLogEntry = {
      id: logId,
      portal,
      ano,
      startedAt: new Date().toISOString(),
      status: 'running',
      progress: { total: 0, ok: 0, error: 0, pending: 0, progress: 0 },
      failures: [],
      message: 'Sincronização iniciada',
    }

    setLoading(true)
    setResultado(null)
    setErro(null)
    setProgress(initialLog.progress)
    setPendentes([])
    setFalhas([])
    setActiveLogId(logId)
    setLogs(prev => [initialLog, ...prev].slice(0, 20))

    try {
      await updateProgressSnapshot(portal, ano, logId)
      startPolling(portal, ano, logId)

      const res = await diarioService.sincronizar(portal, ano)
      stopPolling()
      await updateProgressSnapshot(portal, ano, logId)
      setResultado(res)

      updateLog(logId, current => ({
        ...current,
        finishedAt: new Date().toISOString(),
        status: current.failures.length > 0 ? 'partial' : 'success',
        message: current.failures.length > 0
          ? `Sincronização concluída com ${current.failures.length} falha(s).`
          : 'Sincronização concluída sem falhas.',
      }))
    } catch {
      stopPolling()
      await updateProgressSnapshot(portal, ano, logId)
      setErro('Falha ao sincronizar. Verifique se o backend está disponível.')

      updateLog(logId, current => ({
        ...current,
        finishedAt: new Date().toISOString(),
        status: 'failed',
        message: 'A API de sincronização falhou antes de concluir o processo.',
      }))
    } finally {
      setLoading(false)
    }
  }

  const anosDisponiveis = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i)
  const retryTone = retrySummary ? getRetryTone(retrySummary) : null
  const displayProgress = loading ? Math.min(progress.progress, 99) : progress.progress
  const isFinalizando = loading && progress.total > 0 && progress.pending === 0 && progress.progress === 100
  const showEmAndamento = pendentes.length > 0 || (loading && progress.pending > 0)

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">Sincronizar</h1>
        <p className="text-sm text-gray-500 mt-1">
          Extrai os links do portal, baixa os PDFs e conta as páginas
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Portal</label>
          <select
            value={portal}
            onChange={e => setPortal(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {portais.map(p => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Ano</label>
          <select
            value={ano}
            onChange={e => setAno(Number(e.target.value))}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {anosDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <button
          onClick={handleSincronizar}
          disabled={loading || reprocessandoLote || !portal}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Sincronizando...' : 'Iniciar sincronização'}
        </button>

        <button
          onClick={handleReprocessarLotePortalAno}
          disabled={!portal || loading || reprocessandoFalhas || reprocessandoLote}
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          <RefreshCw size={15} className={reprocessandoLote ? 'animate-spin' : ''} />
          {reprocessandoLote ? 'Reprocessando lote...' : 'Reprocessar falhas do portal/ano'}
        </button>

        {(loading || progress.total > 0) && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>
                {isFinalizando
                  ? 'Finalizando sincronização...'
                  : loading
                    ? 'Processando sincronização...'
                    : 'Último progresso'}
              </span>
              <span>{displayProgress}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${displayProgress}%` }}
              />
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="bg-blue-50 rounded-lg p-2 text-center">
                <p className="font-semibold text-blue-700">{progress.total}</p>
                <p className="text-gray-500 mt-0.5">Total</p>
              </div>
              <div className="bg-green-50 rounded-lg p-2 text-center">
                <p className="font-semibold text-green-700">{progress.ok}</p>
                <p className="text-gray-500 mt-0.5">OK</p>
              </div>
              <div className="bg-red-50 rounded-lg p-2 text-center">
                <p className="font-semibold text-red-700">{progress.error}</p>
                <p className="text-gray-500 mt-0.5">Erros</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-2 text-center">
                <p className="font-semibold text-yellow-700">{progress.pending}</p>
                <p className="text-gray-500 mt-0.5">Pendentes</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {showEmAndamento && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw size={16} className={`${loading ? 'animate-spin text-amber-700' : 'text-amber-700'}`} />
            <span className="text-sm font-medium text-amber-800">Em andamento</span>
          </div>
          {pendentes.length > 0 && (
            <div className="space-y-2 max-h-56 overflow-auto">
              {pendentes.map(item => (
                <div key={item.id} className="bg-white border border-amber-100 rounded-lg p-3 text-xs">
                  <p className="font-medium text-gray-700 truncate">{item.nome_arquivo || item.url}</p>
                  <p className="text-gray-500 truncate">{item.municipio} • {item.data_edicao}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {falhas.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileWarning size={16} className="text-red-600" />
              <span className="text-sm font-medium text-red-700">Falhas de download detectadas</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReprocessarFalhas}
                disabled={reprocessandoFalhas || loading}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300"
              >
                <RefreshCw size={13} className={reprocessandoFalhas ? 'animate-spin' : ''} />
                {reprocessandoFalhas ? 'Reprocessando...' : 'Reprocessar apenas falhas'}
              </button>
              <button
                onClick={() => triggerDownload(
                  `govscan-falhas-${portal}-${ano}.csv`,
                  buildFailureCsv(falhas),
                  'text/csv;charset=utf-8;'
                )}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-white border border-red-200 text-red-700 hover:bg-red-100"
              >
                <Download size={13} />
                Baixar falhas (.csv)
              </button>
            </div>
          </div>
          <div className="space-y-2 max-h-64 overflow-auto">
            {falhas.slice(0, 10).map(item => (
              <div key={item.id} className="bg-white rounded-lg border border-red-100 p-3 text-xs space-y-1">
                <p className="font-medium text-gray-700 truncate">{item.nome_arquivo || item.url}</p>
                <p className="text-gray-500 truncate">{item.municipio} • {item.data_edicao}</p>
                <p className="text-red-600">Erro: {item.erro}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {retrySummary && (
        <div className={`${retryTone?.container} border ${retryTone?.border} rounded-xl p-5 space-y-3`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className={`text-sm font-semibold ${retryTone?.title}`}>Resumo do reprocessamento</h2>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded-full ${retryTone?.badge}`}>{retryTone?.label}</span>
              <span className="text-xs text-gray-600">
                {retrySummary.mode === 'batch' ? 'Modo: lote portal/ano' : 'Modo: falhas selecionadas'}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white rounded-lg p-3 text-center border border-blue-100">
              <p className="text-2xl font-bold text-blue-700">{retrySummary.attempted}</p>
              <p className="text-xs text-gray-500 mt-0.5">Tentadas no reprocessamento</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center border border-green-100">
              <p className="text-2xl font-bold text-green-700">{retrySummary.recovered}</p>
              <p className="text-xs text-gray-500 mt-0.5">Reprocessadas com sucesso</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center border border-red-100">
              <p className="text-2xl font-bold text-red-600">{retrySummary.remaining}</p>
              <p className="text-xs text-gray-500 mt-0.5">Ainda com erro</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
              <p className="text-2xl font-bold text-gray-700">{retrySummary.beforeErrors} → {retrySummary.afterErrors}</p>
              <p className="text-xs text-gray-500 mt-0.5">Erros antes/depois</p>
            </div>
          </div>
          <p className={`text-xs ${retryTone?.title}`}>
            Atualizado em {new Date(retrySummary.recordedAt).toLocaleString('pt-BR')}
          </p>
        </div>
      )}

      {logs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-700">Logs de sincronização</h2>
            {activeLogId && (
              <button
                onClick={() => {
                  const active = logs.find(item => item.id === activeLogId)
                  if (!active) return
                  triggerDownload(
                    `govscan-log-${active.portal}-${active.ano}-${active.id}.json`,
                    buildLogFileContent(active),
                    'application/json;charset=utf-8;'
                  )
                }}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100"
              >
                <Download size={13} />
                Baixar log atual (.json)
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-64 overflow-auto">
            {logs.slice(0, 8).map(item => (
              <div key={item.id} className="rounded-lg border border-gray-100 p-3 text-xs bg-gray-50">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-gray-700">{item.portal} • {item.ano}</p>
                  <span className="text-gray-500">{item.status}</span>
                </div>
                <p className="text-gray-500 mt-1">
                  {new Date(item.startedAt).toLocaleString('pt-BR')} • {item.progress.progress}% • {item.failures.length} falha(s)
                </p>
                {item.message && <p className="text-gray-600 mt-1">{item.message}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {resultado && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={16} className="text-green-600" />
            <span className="text-sm font-medium text-green-700">Concluído com sucesso</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{resultado.salvos}</p>
              <p className="text-xs text-gray-500 mt-0.5">Salvos</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-500">{resultado.erros}</p>
              <p className="text-xs text-gray-500 mt-0.5">Erros</p>
            </div>
          </div>
        </div>
      )}

      {erro && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-4">
          <XCircle size={16} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-600">{erro}</p>
        </div>
      )}
    </div>
  )
}
