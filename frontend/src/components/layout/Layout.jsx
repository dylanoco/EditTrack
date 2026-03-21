import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function Layout() {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950" style={{ '--sidebar-width': '17.5rem' }}>
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
