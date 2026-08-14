import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/candidato/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/candidato/$id"!</div>
}
