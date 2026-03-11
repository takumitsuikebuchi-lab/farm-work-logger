'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Pesticide, Farm } from '@/lib/types'

export default function PesticidesPage() {
  const params = useParams()
  const farmSlug = params.farmSlug as string

  const [farm, setFarm] = useState<Farm | null>(null)
  const [items, setItems] = useState<Pesticide[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Pesticide | null>(null)
  const [name, setName] = useState('')
  const [regNum, setRegNum] = useState('')
  const [dilution, setDilution] = useState('')
  const [unit, setUnit] = useState('L')
  const [saving, setSaving] = useState(false)

  async function loadData() {
    const { data: farmData } = await supabase.from('farms').select('*').eq('slug', farmSlug).single()
    if (!farmData) return
    setFarm(farmData)
    const { data } = await supabase.from('pesticides').select('*').eq('farm_id', farmData.id).order('name')
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [farmSlug])

  function openNew() { setEditTarget(null); setName(''); setRegNum(''); setDilution(''); setUnit('L'); setShowForm(true) }
  function openEdit(p: Pesticide) { setEditTarget(p); setName(p.name); setRegNum(p.registration_number || ''); setDilution(p.default_dilution || ''); setUnit(p.default_unit); setShowForm(true) }

  async function handleSave() {
    if (!farm || !name.trim()) return
    setSaving(true)
    const data = { farm_id: farm.id, name: name.trim(), registration_number: regNum || null, default_dilution: dilution || null, default_unit: unit }
    if (editTarget) { await supabase.from('pesticides').update(data).eq('id', editTarget.id) }
    else { await supabase.from('pesticides').insert(data) }
    setShowForm(false); setSaving(false); loadData()
  }

  async function handleDelete(id: string) {
    if (!confirm('削除しますか？')) return
    await supabase.from('pesticides').delete().eq('id', id)
    loadData()
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p className="text-xl">読み込み中...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-700 text-white px-6 py-5">
        <Link href={`/${farmSlug}/admin`} className="text-sm opacity-80 mb-1 block">← 管理メニュー</Link>
        <h1 className="text-2xl font-bold">農薬マスタ</h1>
        <p className="text-sm opacity-80">{farm?.name}</p>
      </div>
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <button onClick={openNew} className="w-full bg-green-600 text-white text-xl font-bold py-4 rounded-xl mb-5">＋ 農薬を追加</button>
        {showForm && (
          <div className="bg-white rounded-xl border-2 border-green-300 p-5 mb-5">
            <h2 className="text-xl font-bold mb-4">{editTarget ? '農薬を編集' : '農薬を追加'}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-base font-bold text-gray-700 mb-1">農薬名 *</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg" />
              </div>
              <div>
                <label className="block text-base font-bold text-gray-700 mb-1">登録番号</label>
                <input value={regNum} onChange={e => setRegNum(e.target.value)} placeholder="例: 農薬-12345"
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-base font-bold text-gray-700 mb-1">標準希釈倍率</label>
                  <input value={dilution} onChange={e => setDilution(e.target.value)} placeholder="例: 1000倍"
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg" />
                </div>
                <div>
                  <label className="block text-base font-bold text-gray-700 mb-1">単位</label>
                  <select value={unit} onChange={e => setUnit(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg bg-white">
                    <option>L</option><option>mL</option><option>kg</option><option>g</option>
                  </select>
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
          {items.map(p => (
            <div key={p.id} className="bg-white rounded-xl border-2 border-gray-200 px-4 py-4 flex items-start justify-between">
              <div>
                <p className="text-lg font-bold text-gray-800">{p.name}</p>
                <p className="text-sm text-gray-500">{p.registration_number && `登録: ${p.registration_number} / `}{p.default_dilution && `希釈: ${p.default_dilution}`}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(p)} className="text-sm text-blue-600 font-bold px-3 py-1 rounded-lg border border-blue-200 min-h-0 h-auto">編集</button>
                <button onClick={() => handleDelete(p.id)} className="text-sm text-red-500 font-bold px-3 py-1 rounded-lg border border-red-200 min-h-0 h-auto">削除</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
