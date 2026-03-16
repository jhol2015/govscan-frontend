import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FileText, RefreshCw } from 'lucide-react'

const nav = [
  { to: '/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/diarios',     label: 'Diários',      icon: FileText },
  { to: '/sincronizar', label: 'Sincronizar',  icon: RefreshCw },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100">
          <span className="text-lg font-semibold text-blue-700 tracking-tight">GovScan</span>
          <p className="text-xs text-gray-400 mt-0.5">Diários Oficiais</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                 ${isActive
                   ? 'bg-blue-50 text-blue-700 font-medium'
                   : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">Urban Code Labs © 2025</p>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
