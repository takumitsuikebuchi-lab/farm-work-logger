'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Farm, WorkLogWithDetails, Field } from '@/lib/types'

type RangeType = 'day' | 'week' | 'month' | 'custom'

function getDateRange(type: RangeType, baseDate: string): { from: string; to: string } {
  const d = new Date(baseDate)
  if (type === 'day') return { from: baseDate, to: baseDate }
  if (type === 'week') {
    const mon = new Date(d); mon.setDate(d.getDate() - d.getDay() + 1)
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    return { from: mon.toISOString().split('T')[0], to: sun.toISOString().split('T')[0] }
  }
  if (type === 'month') {
    const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    const to = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${lastDay}`
    return { from, to }
  }
  return { from: baseDate, to: baseDate }
}

export default function ReportsPage() {
  const params = useParams()
  const farmSlug = params.farmSlug as string

  const [farm, setFarm] = useState<Farm | null>(null)
  const [rangeType, setRangeType] = useState<RangeType>('day')
  const [baseDate, setBaseDate] = useState(new Date().toISOString().split('T')[0])
  const [customFrom, setCustomFrom] = useState(new Date().toISOString().split('T')[0])
  const [customTo, setCustomTo] = useState(new Date().toISOString().split('T')[0])
  const [logs, setLogs] = useState<WorkLogWithDetails[]>([])
  const [fields, setFields] = useState<Field[]>([])
  const [loading, setLoading] = useState(false)
  const [farmLoading, setFarmLoading] = useState(true)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  useEffect(() => {
    supabase.from('farms').select('*').eq('slug', farmSlug).single()
      .then(({ data }) => { setFarm(data); setFarmLoading(false) })
  }, [farmSlug])

  const { from, to } = rangeType === 'custom' ? { from: customFrom, to: customTo } : getDateRange(rangeType, baseDate)

  async function loadLogs() {
    if (!farm) return
    setLoading(true)
    const [logsRes, fieldsRes] = await Promise.all([
      supabase.from('work_logs')
        .select(`*, workers(*), fields(*), work_log_items(*, work_types(*)), pesticide_uses(*, pesticides(*)), fertilizer_uses(*, fertilizers(*))`)
        .eq('farm_id', farm.id)
        .gte('work_date', from)
        .lte('work_date', to)
        .order('work_date')
        .order('created_at'),
      supabase.from('fields').select('*').eq('farm_id', farm.id).order('name'),
    ])
    setLogs((logsRes.data || []) as WorkLogWithDetails[])
    setFields(fieldsRes.data || [])
    setLoading(false)
  }

  useEffect(() => { if (farm) loadLogs() }, [farm, from, to])

  async function handleExportPdf() {
    setGeneratingPdf(true)
    try {
      const res = await fetch('/api/reports/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farm_id: farm?.id, from, to }),
      })
      if (!res.ok) throw new Error('PDF生成失敗')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `農作業日報_${farm?.name}_${from}_${to}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('PDF出力に失敗しました')
    } finally {
      setGeneratingPdf(false)
    }
  }

  if (farmLoading) return <div className="flex items-center justify-center min-h-screen"><p className="text-xl">読み込み中...</p></div>

  const groupedByDate = logs.reduce<Record<string, WorkLogWithDetails[]>>((acc, log) => {
    if (!acc[log.work_date]) acc[log.work_date] = []
    acc[log.work_date].push(log)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-700 text-white px-6 py-5">
        <Link href={`/${farmSlug}/admin`} className="text-sm opacity-80 mb-1 block">← 管理メニュー</Link>
        <h1 className="text-2xl font-bold">日報・PDF出力</h1>
        <p className="text-sm opacity-80">{farm?.name}</p>
      </div>

      <div className="px-4 py-6 max-w-2xl mx-auto">
        {/* 期間選択 */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4 mb-5">
          <h2 className="text-lg font-bold text-gray-800 mb-3">期間を選択</h2>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {(['day', 'week', 'month', 'custom'] as RangeType[]).map(t => (
              <button key={t} onClick={() => setRangeType(t)}
                className={`py-3 rounded-xl text-base font-bold border-2 transition-colors
                  ${rangeType === t ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200'}`}>
                {t === 'day' ? '1日' : t === 'week' ? '週' : t === 'month' ? '月' : '指定'}
              </button>
            ))}
          </div>
          {rangeType !== 'custom' ? (
            <div>
              <label className="block text-base font-bold text-gray-700 mb-1">基準日</label>
              <input type="date" value={baseDate} onChange={e => setBaseDate(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-base font-bold text-gray-700 mb-1">開始日</label>
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg" />
              </div>
              <div>
                <label className="block text-base font-bold text-gray-700 mb-1">終了日</label>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg" />
              </div>
            </div>
          )}
          <p className="text-sm text-gray-500 mt-2">期間: {from} 〜 {to}</p>
        </div>

        {/* PDF出力ボタン */}
        <button onClick={handleExportPdf} disabled={generatingPdf || logs.length === 0}
          className="w-full bg-blue-600 text-white text-xl font-bold py-4 rounded-xl mb-5 disabled:opacity-40">
          {generatingPdf ? 'PDF生成中...' : `📄 PDF出力（${logs.length}件）`}
        </button>

        {/* 記録プレビュー */}
        {loading ? (
          <p className="text-center text-gray-500 py-8">読み込み中...</p>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-xl">この期間の記録はありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedByDate).map(([date, dateLogs]) => (
              <div key={date} className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
                <div className="bg-gray-100 px-4 py-2">
                  <p className="text-base font-bold text-gray-700">{date}</p>
                </div>
                {dateLogs.map(log => (
                  <div key={log.id} className="px-4 py-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-base font-bold text-gray-800">{(log.field as Field)?.name}</p>
                        <p className="text-sm text-gray-600">
                          {(log as WorkLogWithDetails & { workers?: { name: string } }).workers?.name} /
                          {log.start_time && ` ${log.start_time}〜${log.end_time}`}
                          {log.weather && ` / ${log.weather}`}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {(log.work_log_items as Array<{ work_types?: { name: string } }> | undefined)
                            ?.map(item => item.work_types?.name)
                            .filter(Boolean).join('、')}
                        </p>
                        {log.pesticide_uses && log.pesticide_uses.length > 0 && (
                          <p className="text-xs text-orange-600 mt-1">🧪 農薬: {log.pesticide_uses.length}件</p>
                        )}
                        {log.fertilizer_uses && log.fertilizer_uses.length > 0 && (
                          <p className="text-xs text-blue-600 mt-1">💧 施肥: {log.fertilizer_uses.length}件</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
