import { createServerClient } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function AdminDashboard({ params }: { params: Promise<{ farmSlug: string }> }) {
  const { farmSlug } = await params
  const supabase = createServerClient()

  const { data: farm } = await supabase.from('farms').select('*').eq('slug', farmSlug).single()
  if (!farm) notFound()

  const [fieldsRes, workersRes, logsRes] = await Promise.all([
    supabase.from('fields').select('id').eq('farm_id', farm.id).eq('active', true),
    supabase.from('workers').select('id').eq('farm_id', farm.id).eq('active', true),
    supabase.from('work_logs').select('id').eq('farm_id', farm.id)
      .gte('work_date', new Date().toISOString().split('T')[0]),
  ])

  const menuItems = [
    { href: `/${farmSlug}/admin/fields`, label: '圃場管理', icon: '🌾', desc: `${fieldsRes.data?.length ?? 0}件登録中` },
    { href: `/${farmSlug}/admin/workers`, label: '作業者管理', icon: '👤', desc: `${workersRes.data?.length ?? 0}名` },
    { href: `/${farmSlug}/admin/work-types`, label: '作業項目', icon: '📋', desc: 'マスタ設定' },
    { href: `/${farmSlug}/admin/crops`, label: '作物管理', icon: '🥦', desc: 'マスタ設定' },
    { href: `/${farmSlug}/admin/pesticides`, label: '農薬マスタ', icon: '🧪', desc: 'マスタ設定' },
    { href: `/${farmSlug}/admin/fertilizers`, label: '肥料マスタ', icon: '💧', desc: 'マスタ設定' },
    { href: `/${farmSlug}/admin/qr-codes`, label: 'QRコード印刷', icon: '📱', desc: 'A4印刷用' },
    { href: `/${farmSlug}/reports`, label: '日報・PDF出力', icon: '📄', desc: `今日 ${logsRes.data?.length ?? 0}件` },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-700 text-white px-6 py-5">
        <Link href="/admin" className="text-sm opacity-80 mb-1 block">← 農場一覧</Link>
        <h1 className="text-2xl font-bold">{farm.name}</h1>
        <p className="text-base opacity-80">管理メニュー</p>
      </div>
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <div className="grid grid-cols-2 gap-3">
          {menuItems.map(item => (
            <Link key={item.href} href={item.href}
              className="bg-white rounded-xl border-2 border-gray-200 px-4 py-5 flex flex-col hover:border-green-400 transition-colors">
              <span className="text-3xl mb-2">{item.icon}</span>
              <span className="text-lg font-bold text-gray-800">{item.label}</span>
              <span className="text-sm text-gray-500 mt-1">{item.desc}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
