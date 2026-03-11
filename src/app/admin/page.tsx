import { createServerClient } from '@/lib/supabase'
import Link from 'next/link'

export default async function AdminTopPage() {
  const supabase = createServerClient()
  const { data: farms } = await supabase.from('farms').select('*').order('name')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-700 text-white px-6 py-5">
        <h1 className="text-3xl font-bold">農作業記録 管理</h1>
        <p className="text-base opacity-80 mt-1">農場を選択してください</p>
      </div>
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <div className="grid gap-4">
          {farms?.map(farm => (
            <Link key={farm.id} href={`/${farm.slug}/admin`}
              className="bg-white rounded-xl border-2 border-gray-200 px-6 py-5 flex items-center justify-between hover:border-green-400 transition-colors">
              <div>
                <h2 className="text-xl font-bold text-gray-800">{farm.name}</h2>
                <p className="text-sm text-gray-500 mt-1">{farm.address}</p>
              </div>
              <span className="text-2xl">›</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
