const map: Record<string, string> = {
  ok:      'bg-green-100 text-green-700',
  error:   'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700',
}

const label: Record<string, string> = {
  ok:      'OK',
  error:   'Erro',
  pending: 'Pendente',
}

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {label[status] ?? status}
    </span>
  )
}
