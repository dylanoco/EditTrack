import { useParams, Link } from 'react-router-dom'

export function ClientPage() {
  const { id } = useParams()
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Client #{id}</h1>
      <p className="mt-2 text-gray-500 dark:text-gray-400">Single client view and quick deliverable flow will appear here.</p>
      <Link to="/deliverables" className="mt-4 inline-block text-sm font-medium text-violet-600 hover:text-violet-500 dark:text-violet-400">Go to Deliverables</Link>
    </div>
  )
}
