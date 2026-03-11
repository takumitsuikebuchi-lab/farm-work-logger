'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Crop, CropCategory, Farm } from '@/lib/types'

export default function CropsPage() {
  const params = useParams()
  const farmSlug = params.farmSlug as string

  const [farm, setFarm] = useState<Farm | null>(null)
  const [categories, setCategories] = useState<CropCategory[]>([])
  const [crops, setCrops] = useState<(Crop & { crop_category?: CropCategory })[]>([])
  const [loading, setLoading] = useState(true)
  const [showCropForm, setShowCropForm] = useState(false)
  const [showCatForm, setShowCatForm] = useState(false)
  const [cropName, setCropName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [catName, setCatName] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadData() {
    const { data: farmData } = await supabase.from('farms').select('*').eq('slug', farmSlug).single()
    if (!farmData) return
    setFarm(farmData)
    const [catsRes, cropsRes] = await Promise.all([
      supabase.from('crop_categories').select('*').eq('farm_id', farmData.id).order('sort_order'),
      supabase.from('crops').select('*, crop_categories(*)').eq('farm_id', farmData.id).order('name'),
    ])
    setCategories(catsRes.data || [])
    setCrops((cropsRes.data || []) as (Crop & { crop_category?: CropCategory })[])
    if (catsRes.data?.length) setCategoryId(catsRes.data[0].id)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [farmSlug])

  async function handleAddCrop() {
    if (!farm || !cropName.trim()) return
    setSaving(true)
    await supabase.from('crops').insert({ farm_id: farm.id, name: cropName.trim(), category_id: categoryId || null })
    setCropName(''); setShowCropForm(false); setSaving(false); loadData()
  }

  async function handleAddCategory() {
    if (!farm || !catName.trim()) return
    setSaving(true)
    await supabase.from('crop_categories').insert({ farm_id: farm.id, name: catName.trim(), sort_order: categories.length + 1 })
    setCatName(''); setShowCatForm(false); setSaving(false); loadData()
  }

  async function handleDeleteCrop(id: string) {
    if (!confirm('削除しますか？')) return
    await supabase.from('crops').delete().eq('id', id)
    loadData()
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p className="text-xl">読み込み中...</p></div>

  const groupedCrops = categories.map(cat => ({
    category: cat,
    crops: crops.filter(c => c.category_id === cat.id),
  }))
  const uncategorized = crops.filter(c => !c.category_id)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-700 text-white px-6 py-5">
        <Link href={`/${farmSlug}/admin`} className="text-sm opacity-80 mb-1 block">← 管理メニュー</Link>
        <h1 className="text-2xl font-bold">作物管理</h1>
        <p className="text-sm opacity-80">{farm?.name}</p>
      </div>
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <div className="flex gap-3 mb-5">
          <button onClick={() => setShowCropForm(true)} className="flex-1 bg-green-600 text-white text-lg font-bold py-4 rounded-xl">＋ 作物を追加</button>
          <button onClick={() => setShowCatForm(true)} className="flex-1 bg-gray-600 text-white text-lg font-bold py-4 rounded-xl">＋ カテゴリ追加</button>
        </div>

        {showCatForm && (
          <div className="bg-white rounded-xl border-2 border-gray-300 p-5 mb-5">
            <label className="block text-base font-bold text-gray-700 mb-2">カテゴリ名</label>
            <input value={catName} onChange={e => setCatName(e.target.value)} placeholder="例: 米、野菜、果樹"
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg mb-3" />
            <div className="flex gap-3">
              <button onClick={() => setShowCatForm(false)} className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-600 font-bold">キャンセル</button>
              <button onClick={handleAddCategory} disabled={!catName.trim() || saving} className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold disabled:opacity-40">追加</button>
            </div>
          </div>
        )}

        {showCropForm && (
          <div className="bg-white rounded-xl border-2 border-green-300 p-5 mb-5">
            <div className="space-y-3">
              <div>
                <label className="block text-base font-bold text-gray-700 mb-1">作物名 *</label>
                <input value={cropName} onChange={e => setCropName(e.target.value)} placeholder="例: コシヒカリ、トマト"
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg" />
              </div>
              <div>
                <label className="block text-base font-bold text-gray-700 mb-1">カテゴリ</label>
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg bg-white">
                  <option value="">カテゴリなし</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowCropForm(false)} className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-600 font-bold">キャンセル</button>
              <button onClick={handleAddCrop} disabled={!cropName.trim() || saving} className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold disabled:opacity-40">
                {saving ? '保存中...' : '追加'}
              </button>
            </div>
          </div>
        )}

        {groupedCrops.map(({ category, crops: catCrops }) => catCrops.length > 0 && (
          <div key={category.id} className="mb-4">
            <h3 className="text-sm font-bold text-gray-500 mb-2">{category.name}</h3>
            <div className="space-y-2">
              {catCrops.map(c => (
                <div key={c.id} className="bg-white rounded-xl border-2 border-gray-200 px-4 py-3 flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-800">{c.name}</span>
                  <button onClick={() => handleDeleteCrop(c.id)} className="text-sm text-red-500 font-bold px-3 py-1 rounded-lg border border-red-200 min-h-0 h-auto">削除</button>
                </div>
              ))}
            </div>
          </div>
        ))}
        {uncategorized.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-gray-500 mb-2">カテゴリなし</h3>
            {uncategorized.map(c => (
              <div key={c.id} className="bg-white rounded-xl border-2 border-gray-200 px-4 py-3 flex items-center justify-between mb-2">
                <span className="text-lg font-bold text-gray-800">{c.name}</span>
                <button onClick={() => handleDeleteCrop(c.id)} className="text-sm text-red-500 font-bold px-3 py-1 rounded-lg border border-red-200 min-h-0 h-auto">削除</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
