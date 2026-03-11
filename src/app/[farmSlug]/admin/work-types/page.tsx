'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { WorkType, WorkCategory, Farm } from '@/lib/types'

export default function WorkTypesPage() {
  const params = useParams()
  const farmSlug = params.farmSlug as string

  const [farm, setFarm] = useState<Farm | null>(null)
  const [categories, setCategories] = useState<WorkCategory[]>([])
  const [workTypes, setWorkTypes] = useState<WorkType[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [needsPesticide, setNeedsPesticide] = useState(false)
  const [needsFertilizer, setNeedsFertilizer] = useState(false)
  const [saving, setSaving] = useState(false)

  async function loadData() {
    const { data: farmData } = await supabase.from('farms').select('*').eq('slug', farmSlug).single()
    if (!farmData) return
    setFarm(farmData)
    const [catsRes, typesRes] = await Promise.all([
      supabase.from('work_categories').select('*').eq('farm_id', farmData.id).order('sort_order'),
      supabase.from('work_types').select('*').eq('farm_id', farmData.id).order('sort_order'),
    ])
    setCategories(catsRes.data || [])
    setWorkTypes(typesRes.data || [])
    if (catsRes.data?.length) setCategoryId(catsRes.data[0].id)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [farmSlug])

  async function handleAdd() {
    if (!farm || !name.trim()) return
    setSaving(true)
    await supabase.from('work_types').insert({
      farm_id: farm.id, name: name.trim(), category_id: categoryId || null,
      needs_pesticide: needsPesticide, needs_fertilizer: needsFertilizer, sort_order: workTypes.length + 1,
    })
    setName(''); setNeedsPesticide(false); setNeedsFertilizer(false)
    setShowForm(false); setSaving(false); loadData()
  }

  async function handleDelete(id: string) {
    if (!confirm('削除しますか？')) return
    await supabase.from('work_types').delete().eq('id', id)
    loadData()
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p className="text-xl">読み込み中...</p></div>

  const grouped = categories.map(cat => ({
    category: cat,
    types: workTypes.filter(wt => wt.category_id === cat.id),
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-700 text-white px-6 py-5">
        <Link href={`/${farmSlug}/admin`} className="text-sm opacity-80 mb-1 block">← 管理メニュー</Link>
        <h1 className="text-2xl font-bold">作業項目マスタ</h1>
        <p className="text-sm opacity-80">{farm?.name}</p>
      </div>
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <button onClick={() => setShowForm(true)} className="w-full bg-green-600 text-white text-xl font-bold py-4 rounded-xl mb-5">＋ 作業項目を追加</button>
        {showForm && (
          <div className="bg-white rounded-xl border-2 border-green-300 p-5 mb-5">
            <div className="space-y-3">
              <div>
                <label className="block text-base font-bold text-gray-700 mb-1">作業名 *</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg" />
              </div>
              <div>
                <label className="block text-base font-bold text-gray-700 mb-1">カテゴリ</label>
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg bg-white">
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={needsPesticide} onChange={e => setNeedsPesticide(e.target.checked)}
                    className="w-5 h-5" style={{ minHeight: 'auto' }} />
                  <span className="text-base font-bold text-orange-600">農薬記録が必要</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={needsFertilizer} onChange={e => setNeedsFertilizer(e.target.checked)}
                    className="w-5 h-5" style={{ minHeight: 'auto' }} />
                  <span className="text-base font-bold text-blue-600">施肥記録が必要</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-600 font-bold">キャンセル</button>
              <button onClick={handleAdd} disabled={!name.trim() || saving} className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold disabled:opacity-40">
                {saving ? '保存中...' : '追加'}
              </button>
            </div>
          </div>
        )}
        {grouped.map(({ category, types }) => types.length > 0 && (
          <div key={category.id} className="mb-4">
            <h3 className="text-sm font-bold text-gray-500 mb-2 border-b pb-1">{category.name}</h3>
            <div className="space-y-2">
              {types.map(wt => (
                <div key={wt.id} className="bg-white rounded-xl border-2 border-gray-200 px-4 py-3 flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold text-gray-800">{wt.name}</span>
                    <div className="flex gap-1 mt-1">
                      {wt.needs_pesticide && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">農薬</span>}
                      {wt.needs_fertilizer && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">施肥</span>}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(wt.id)} className="text-sm text-red-500 font-bold px-3 py-1 rounded-lg border border-red-200 min-h-0 h-auto">削除</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
