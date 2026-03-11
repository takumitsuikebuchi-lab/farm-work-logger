'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Field, Farm, Crop } from '@/lib/types'

export default function FieldsPage() {
  const params = useParams()
  const farmSlug = params.farmSlug as string

  const [farm, setFarm] = useState<Farm | null>(null)
  const [fields, setFields] = useState<(Field & { crop?: Crop })[]>([])
  const [crops, setCrops] = useState<Crop[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Field | null>(null)

  // フォーム状態
  const [name, setName] = useState('')
  const [area, setArea] = useState('')
  const [cropId, setCropId] = useState('')
  const [locationNote, setLocationNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadData() {
    const { data: farmData } = await supabase.from('farms').select('*').eq('slug', farmSlug).single()
    if (!farmData) return
    setFarm(farmData)
    const [fieldsRes, cropsRes] = await Promise.all([
      supabase.from('fields').select('*, crops(*)').eq('farm_id', farmData.id).order('name'),
      supabase.from('crops').select('*').eq('farm_id', farmData.id).order('name'),
    ])
    setFields((fieldsRes.data || []) as (Field & { crop?: Crop })[])
    setCrops(cropsRes.data || [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [farmSlug])

  function openNew() {
    setEditTarget(null)
    setName(''); setArea(''); setCropId(''); setLocationNote('')
    setShowForm(true)
  }

  function openEdit(f: Field) {
    setEditTarget(f)
    setName(f.name); setArea(f.area?.toString() || ''); setCropId(f.current_crop_id || ''); setLocationNote(f.location_note || '')
    setShowForm(true)
  }

  async function handleSave() {
    if (!farm || !name) return
    setSaving(true)
    const qrSlug = editTarget?.qr_slug || `${farmSlug}-field-${Date.now()}`
    const data = {
      farm_id: farm.id,
      name,
      area: area ? parseFloat(area) : null,
      current_crop_id: cropId || null,
      location_note: locationNote || null,
      qr_slug: qrSlug,
    }
    if (editTarget) {
      await supabase.from('fields').update(data).eq('id', editTarget.id)
    } else {
      await supabase.from('fields').insert(data)
    }
    setShowForm(false)
    setSaving(false)
    loadData()
  }

  async function toggleActive(f: Field) {
    await supabase.from('fields').update({ active: !f.active }).eq('id', f.id)
    loadData()
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p className="text-xl">読み込み中...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-700 text-white px-6 py-5">
        <Link href={`/${farmSlug}/admin`} className="text-sm opacity-80 mb-1 block">← 管理メニュー</Link>
        <h1 className="text-2xl font-bold">圃場管理</h1>
        <p className="text-sm opacity-80">{farm?.name}</p>
      </div>
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <button onClick={openNew}
          className="w-full bg-green-600 text-white text-xl font-bold py-4 rounded-xl mb-5">
          ＋ 圃場を追加
        </button>

        {showForm && (
          <div className="bg-white rounded-xl border-2 border-green-300 p-5 mb-5">
            <h2 className="text-xl font-bold mb-4">{editTarget ? '圃場を編集' : '圃場を追加'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-base font-bold text-gray-700 mb-1">圃場名 *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="例: 田んぼA（北側）"
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg" />
              </div>
              <div>
                <label className="block text-base font-bold text-gray-700 mb-1">面積（アール）</label>
                <input type="number" value={area} onChange={e => setArea(e.target.value)} placeholder="例: 30"
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg" />
              </div>
              <div>
                <label className="block text-base font-bold text-gray-700 mb-1">現在の作物</label>
                <select value={cropId} onChange={e => setCropId(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg bg-white">
                  <option value="">選択してください</option>
                  {crops.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-base font-bold text-gray-700 mb-1">場所メモ</label>
                <input value={locationNote} onChange={e => setLocationNote(e.target.value)} placeholder="例: 〇〇町北部"
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-600 font-bold">
                キャンセル
              </button>
              <button onClick={handleSave} disabled={!name || saving}
                className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold disabled:opacity-40">
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {fields.map(f => (
            <div key={f.id} className={`bg-white rounded-xl border-2 px-4 py-4 ${f.active ? 'border-gray-200' : 'border-gray-100 opacity-50'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{f.name}</h3>
                  <p className="text-sm text-gray-500">
                    {f.area ? `${f.area}a` : ''}{f.crop ? ` / ${(f.crop as Crop).name}` : ''}
                    {f.location_note ? ` / ${f.location_note}` : ''}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">QR: {f.qr_slug}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(f)}
                    className="text-sm text-blue-600 font-bold px-3 py-1 rounded-lg border border-blue-200 min-h-0 h-auto">
                    編集
                  </button>
                  <button onClick={() => toggleActive(f)}
                    className={`text-sm font-bold px-3 py-1 rounded-lg border min-h-0 h-auto
                      ${f.active ? 'text-gray-500 border-gray-200' : 'text-green-600 border-green-200'}`}>
                    {f.active ? '無効化' : '有効化'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
