'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Worker, Farm } from '@/lib/types'

export default function WorkersPage() {
  const params = useParams()
  const farmSlug = params.farmSlug as string

  const [farm, setFarm] = useState<Farm | null>(null)
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadData() {
    const { data: farmData } = await supabase.from('farms').select('*').eq('slug', farmSlug).single()
    if (!farmData) return
    setFarm(farmData)
    const { data } = await supabase.from('workers').select('*').eq('farm_id', farmData.id).order('name')
    setWorkers(data || [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [farmSlug])

  async function handleAdd() {
    if (!farm || !name.trim()) return
    setSaving(true)
    await supabase.from('workers').insert({ farm_id: farm.id, name: name.trim() })
    setName(''); setShowForm(false); setSaving(false)
    loadData()
  }

  async function toggleActive(w: Worker) {
    await supabase.from('workers').update({ active: !w.active }).eq('id', w.id)
    loadData()
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p className="text-xl">読み込み中...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-700 text-white px-6 py-5">
        <Link href={`/${farmSlug}/admin`} className="text-sm opacity-80 mb-1 block">← 管理メニュー</Link>
        <h1 className="text-2xl font-bold">作業者管理</h1>
        <p className="text-sm opacity-80">{farm?.name}</p>
      </div>
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <button onClick={() => setShowForm(true)}
          className="w-full bg-green-600 text-white text-xl font-bold py-4 rounded-xl mb-5">
          ＋ 作業者を追加
        </button>
        {showForm && (
          <div className="bg-white rounded-xl border-2 border-green-300 p-5 mb-5">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="名前を入力"
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-xl mb-3" />
            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-600 font-bold">キャンセル</button>
              <button onClick={handleAdd} disabled={!name.trim() || saving} className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold disabled:opacity-40">
                {saving ? '保存中...' : '追加'}
              </button>
            </div>
          </div>
        )}
        <div className="space-y-3">
          {workers.map(w => (
            <div key={w.id} className={`bg-white rounded-xl border-2 px-4 py-4 flex items-center justify-between ${w.active ? 'border-gray-200' : 'border-gray-100 opacity-50'}`}>
              <span className="text-xl font-bold text-gray-800">{w.name}</span>
              <button onClick={() => toggleActive(w)}
                className={`text-sm font-bold px-4 py-2 rounded-lg border min-h-0 h-auto ${w.active ? 'text-gray-500 border-gray-200' : 'text-green-600 border-green-200'}`}>
                {w.active ? '無効化' : '有効化'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
