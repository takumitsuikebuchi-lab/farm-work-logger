'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Fertilizer, Farm } from '@/lib/types'

const FERTILIZER_TYPES = ['有機', '化学', '液体', 'その他'] as const

export default function FertilizersPage() {
  const params = useParams()
  const farmSlug = params.farmSlug as string

  const [farm, setFarm] = useState<Farm | null>(null)
  const [items, setItems] = useState<Fertilizer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Fertilizer | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<string>('有機')
  const [saving, setSaving] = useState(false)

  async function loadData() {
    const { data: farmData } = await supabase.from('farms').select('*').eq('slug', farmSlug).single()
    if (!farmData) return
    setFarm(farmData)
    const { data } = await supabase.from('fertilizers').select('*').eq('farm_id', farmData.id).order('name')
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [farmSlug])

  function openNew() { setEditTarget(null); setName(''); setType('有機'); setShowForm(true) }
  function openEdit(f: Fertilizer) { setEditTarget(f); setName(f.name); setType(f.type || '有機'); setShowForm(true) }

  async function handleSave() {
    if (!farm || !name.trim()) return
    setSaving(true)
    const data = { farm_id: farm.id, name: name.trim(), type }
    if (editTarget) { await supabase.from('fertilizers').update(data).eq('id', editTarget.id) }
    else { await supabase.from('fertilizers').insert(data) }
    setShowForm(false); setSaving(false); loadData()
  }

  async function handleDelete(id: string) {
    if (!confirm('削除しますか？')) return
    await supabase.from('fertilizers').delete().eq('id', id)
    loadData()
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p className="text-xl">読み込み中...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-700 text-white px-6 py-5">
        <Link href={`/${farmSlug}/admin`} className="text-sm opacity-80 mb-1 block">← 管理メニュー</Link>
        <h1 className="text-2xl font-bold">肥料マスタ</h1>
        <p className="text-sm opacity-80">{farm?.name}</p>
      </div>
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <button onClick={openNew} className="w-full bg-green-600 text-white text-xl font-bold py-4 rounded-xl mb-5">＋ 肥料を追加</button>
        {showForm && (
          <div className="bg-white rounded-xl border-2 border-green-300 p-5 mb-5">
            <div className="space-y-3">
              <div>
                <label className="block text-base font-bold text-gray-700 mb-1">肥料名 *</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg" />
              </div>
              <div>
                <label className="block text-base font-bold text-gray-700 mb-1">種類</label>
                <div className="grid grid-cols-4 gap-2">
                  {FERTILIZER_TYPES.map(t => (
                    <button key={t} onClick={() => setType(t)}
                      className={`py-3 rounded-xl text-base font-bold border-2 ${type === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-600 font-bold">キャンセル</button>
              <button onClick={handleSave} disabled={!name.trim() || saving} className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold disabled:opacity-40">
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        )}
        <div className="space-y-3">
          {items.map(f => (
            <div key={f.id} className="bg-white rounded-xl border-2 border-gray-200 px-4 py-4 flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-gray-800">{f.name}</p>
                {f.type && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{f.type}</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(f)} className="text-sm text-blue-600 font-bold px-3 py-1 rounded-lg border border-blue-200 min-h-0 h-auto">編集</button>
                <button onClick={() => handleDelete(f.id)} className="text-sm text-red-500 font-bold px-3 py-1 rounded-lg border border-red-200 min-h-0 h-auto">削除</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
