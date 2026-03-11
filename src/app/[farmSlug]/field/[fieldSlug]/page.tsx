'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Field, Worker, WorkCategory, WorkType, Pesticide, Fertilizer, Crop } from '@/lib/types'

// 天候の選択肢
const WEATHER_OPTIONS = ['晴', '曇', '雨', '雪', '晴れ時々曇', '曇り時々雨'] as const

// 時刻の選択肢（30分刻み）
function buildTimeOptions() {
  const opts: string[] = []
  for (let h = 5; h <= 20; h++) {
    opts.push(`${String(h).padStart(2, '0')}:00`)
    opts.push(`${String(h).padStart(2, '0')}:30`)
  }
  return opts
}
const TIME_OPTIONS = buildTimeOptions()

interface PesticideEntry {
  pesticide_id: string
  dilution_ratio: string
  amount_used: string
  amount_unit: string
  spray_area: string
  target_pest: string
}

interface FertilizerEntry {
  fertilizer_id: string
  amount_used: string
  amount_unit: string
  method: '元肥' | '追肥' | '葉面散布' | 'その他'
}

type Step = 'worker' | 'datetime' | 'worktype' | 'pesticide' | 'fertilizer' | 'confirm' | 'done'

export default function FieldInputPage() {
  const params = useParams()
  const farmSlug = params.farmSlug as string
  const fieldSlug = params.fieldSlug as string

  // データ
  const [field, setField] = useState<(Field & { crop?: Crop }) | null>(null)
  const [workers, setWorkers] = useState<Worker[]>([])
  const [workCategories, setWorkCategories] = useState<(WorkCategory & { work_types: WorkType[] })[]>([])
  const [pesticides, setPesticides] = useState<Pesticide[]>([])
  const [fertilizers, setFertilizers] = useState<Fertilizer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 入力値
  const [step, setStep] = useState<Step>('worker')
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null)
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('17:00')
  const [weather, setWeather] = useState<string>('晴')
  const [selectedWorkTypes, setSelectedWorkTypes] = useState<Set<string>>(new Set())
  const [pesticideEntries, setPesticideEntries] = useState<PesticideEntry[]>([])
  const [fertilizerEntries, setFertilizerEntries] = useState<FertilizerEntry[]>([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // データ取得
  const loadData = useCallback(async () => {
    try {
      // 圃場情報取得
      const { data: fieldData, error: fieldErr } = await supabase
        .from('fields')
        .select('*, crops(*)')
        .eq('qr_slug', fieldSlug)
        .single()
      if (fieldErr || !fieldData) throw new Error('圃場が見つかりません')

      // 農場確認
      const { data: farmData, error: farmErr } = await supabase
        .from('farms')
        .select('id, slug')
        .eq('id', fieldData.farm_id)
        .single()
      if (farmErr || farmData.slug !== farmSlug) throw new Error('農場が見つかりません')

      const farmId = fieldData.farm_id

      // 作業者・作業カテゴリ・農薬・肥料を並列取得
      const [workersRes, categoriesRes, workTypesRes, pesticidesRes, fertilizersRes] = await Promise.all([
        supabase.from('workers').select('*').eq('farm_id', farmId).eq('active', true).order('name'),
        supabase.from('work_categories').select('*').eq('farm_id', farmId).order('sort_order'),
        supabase.from('work_types').select('*').eq('farm_id', farmId).order('sort_order'),
        supabase.from('pesticides').select('*').eq('farm_id', farmId).order('name'),
        supabase.from('fertilizers').select('*').eq('farm_id', farmId).order('name'),
      ])

      // 作業カテゴリに作業項目をグルーピング
      const categoriesWithTypes = (categoriesRes.data || []).map(cat => ({
        ...cat,
        work_types: (workTypesRes.data || []).filter(wt => wt.category_id === cat.id),
      }))

      setField(fieldData as Field & { crop?: Crop })
      setWorkers(workersRes.data || [])
      setWorkCategories(categoriesWithTypes)
      setPesticides(pesticidesRes.data || [])
      setFertilizers(fertilizersRes.data || [])

      // 天候を自動取得（バックグラウンド）
      fetch(`/api/weather?lat=${farmData ? '' : ''}&farm_id=${farmId}`)
        .then(r => r.json())
        .then(d => { if (d.weather) setWeather(d.weather) })
        .catch(() => {})

    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }, [farmSlug, fieldSlug])

  useEffect(() => { loadData() }, [loadData])

  // 農薬・施肥が必要かどうかチェック
  const needsPesticide = Array.from(selectedWorkTypes).some(id => {
    for (const cat of workCategories) {
      const wt = cat.work_types.find(w => w.id === id)
      if (wt?.needs_pesticide) return true
    }
    return false
  })
  const needsFertilizer = Array.from(selectedWorkTypes).some(id => {
    for (const cat of workCategories) {
      const wt = cat.work_types.find(w => w.id === id)
      if (wt?.needs_fertilizer) return true
    }
    return false
  })

  // 次のステップを計算
  const getNextStep = (current: Step): Step => {
    if (current === 'worktype') {
      if (needsPesticide && pesticideEntries.length === 0) return 'pesticide'
      if (needsFertilizer && fertilizerEntries.length === 0) return 'fertilizer'
      return 'confirm'
    }
    if (current === 'pesticide') {
      if (needsFertilizer && fertilizerEntries.length === 0) return 'fertilizer'
      return 'confirm'
    }
    if (current === 'fertilizer') return 'confirm'
    const flow: Step[] = ['worker', 'datetime', 'worktype']
    const idx = flow.indexOf(current)
    return idx >= 0 ? flow[idx + 1] : 'confirm'
  }

  // 保存
  const handleSave = async () => {
    if (!field || !selectedWorker || selectedWorkTypes.size === 0) return
    setSaving(true)
    try {
      const res = await fetch('/api/work-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farm_id: field.farm_id,
          field_id: field.id,
          worker_id: selectedWorker.id,
          work_date: workDate,
          start_time: startTime,
          end_time: endTime,
          weather,
          weather_source: 'manual',
          notes,
          work_type_ids: Array.from(selectedWorkTypes),
          pesticide_uses: pesticideEntries.map(e => ({
            pesticide_id: e.pesticide_id,
            dilution_ratio: e.dilution_ratio,
            amount_used: e.amount_used ? parseFloat(e.amount_used) : null,
            amount_unit: e.amount_unit,
            spray_area: e.spray_area ? parseFloat(e.spray_area) : null,
            target_pest: e.target_pest,
          })),
          fertilizer_uses: fertilizerEntries.map(e => ({
            fertilizer_id: e.fertilizer_id,
            amount_used: e.amount_used ? parseFloat(e.amount_used) : null,
            amount_unit: e.amount_unit,
            method: e.method,
          })),
        }),
      })
      if (!res.ok) throw new Error('保存に失敗しました')
      setStep('done')
    } catch {
      alert('保存に失敗しました。もう一度お試しください。')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingScreen />
  if (error) return <ErrorScreen message={error} />
  if (!field) return <ErrorScreen message="圃場が見つかりません" />

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-green-700 text-white px-4 py-4">
        <p className="text-sm opacity-80">農作業記録</p>
        <h1 className="text-2xl font-bold">{field.name}</h1>
        {field.crop && <p className="text-base opacity-90 mt-1">作物: {field.crop.name}</p>}
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto">
        {step === 'done' ? (
          <DoneScreen onAnother={() => {
            setStep('worker')
            setSelectedWorker(null)
            setSelectedWorkTypes(new Set())
            setPesticideEntries([])
            setFertilizerEntries([])
            setNotes('')
          }} />
        ) : (
          <>
            {/* ステップ表示 */}
            <StepIndicator step={step} />

            {/* 各ステップ */}
            {step === 'worker' && (
              <WorkerStep
                workers={workers}
                selected={selectedWorker}
                onSelect={w => { setSelectedWorker(w); setStep('datetime') }}
              />
            )}

            {step === 'datetime' && (
              <DatetimeStep
                workDate={workDate}
                startTime={startTime}
                endTime={endTime}
                weather={weather}
                onDateChange={setWorkDate}
                onStartChange={setStartTime}
                onEndChange={setEndTime}
                onWeatherChange={setWeather}
                onNext={() => setStep('worktype')}
                onBack={() => setStep('worker')}
              />
            )}

            {step === 'worktype' && (
              <WorkTypeStep
                categories={workCategories}
                selected={selectedWorkTypes}
                onToggle={id => {
                  setSelectedWorkTypes(prev => {
                    const next = new Set(prev)
                    if (next.has(id)) next.delete(id)
                    else next.add(id)
                    return next
                  })
                }}
                onNext={() => setStep(getNextStep('worktype'))}
                onBack={() => setStep('datetime')}
              />
            )}

            {step === 'pesticide' && (
              <PesticideStep
                pesticides={pesticides}
                entries={pesticideEntries}
                onAdd={() => setPesticideEntries(prev => [...prev, {
                  pesticide_id: pesticides[0]?.id || '',
                  dilution_ratio: pesticides[0]?.default_dilution || '',
                  amount_used: '',
                  amount_unit: 'L',
                  spray_area: '',
                  target_pest: '',
                }])}
                onRemove={i => setPesticideEntries(prev => prev.filter((_, idx) => idx !== i))}
                onChange={(i, field, val) => setPesticideEntries(prev => {
                  const next = [...prev]
                  next[i] = { ...next[i], [field]: val }
                  return next
                })}
                onNext={() => setStep(getNextStep('pesticide'))}
                onBack={() => setStep('worktype')}
              />
            )}

            {step === 'fertilizer' && (
              <FertilizerStep
                fertilizers={fertilizers}
                entries={fertilizerEntries}
                onAdd={() => setFertilizerEntries(prev => [...prev, {
                  fertilizer_id: fertilizers[0]?.id || '',
                  amount_used: '',
                  amount_unit: 'kg',
                  method: '追肥',
                }])}
                onRemove={i => setFertilizerEntries(prev => prev.filter((_, idx) => idx !== i))}
                onChange={(i, field, val) => setFertilizerEntries(prev => {
                  const next = [...prev]
                  next[i] = { ...next[i], [field]: val }
                  return next
                })}
                onNext={() => setStep('confirm')}
                onBack={() => needsPesticide ? setStep('pesticide') : setStep('worktype')}
              />
            )}

            {step === 'confirm' && (
              <ConfirmStep
                field={field}
                worker={selectedWorker!}
                workDate={workDate}
                startTime={startTime}
                endTime={endTime}
                weather={weather}
                selectedWorkTypes={selectedWorkTypes}
                workCategories={workCategories}
                pesticideEntries={pesticideEntries}
                pesticides={pesticides}
                fertilizerEntries={fertilizerEntries}
                fertilizers={fertilizers}
                notes={notes}
                onNotesChange={setNotes}
                onSave={handleSave}
                onBack={() => {
                  if (needsFertilizer) setStep('fertilizer')
                  else if (needsPesticide) setStep('pesticide')
                  else setStep('worktype')
                }}
                saving={saving}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ========================================
// サブコンポーネント
// ========================================

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-xl text-gray-500">読み込み中...</p>
    </div>
  )
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <p className="text-2xl text-red-600 font-bold mb-2">エラー</p>
        <p className="text-lg text-gray-700">{message}</p>
      </div>
    </div>
  )
}

function DoneScreen({ onAnother }: { onAnother: () => void }) {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">✅</div>
      <h2 className="text-3xl font-bold text-green-700 mb-2">保存しました</h2>
      <p className="text-lg text-gray-600 mb-8">作業記録を保存しました</p>
      <button
        onClick={onAnother}
        className="bg-green-600 text-white text-xl font-bold px-8 py-4 rounded-xl w-full"
      >
        続けて記録する
      </button>
    </div>
  )
}

function StepIndicator({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: 'worker', label: '作業者' },
    { key: 'datetime', label: '日時' },
    { key: 'worktype', label: '作業内容' },
    { key: 'confirm', label: '確認' },
  ]
  const activeIdx = steps.findIndex(s => s.key === step) ?? 0
  return (
    <div className="flex justify-between mb-6">
      {steps.map((s, i) => (
        <div key={s.key} className="flex flex-col items-center flex-1">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-1
            ${i <= activeIdx ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
            {i + 1}
          </div>
          <span className={`text-xs ${i <= activeIdx ? 'text-green-700 font-bold' : 'text-gray-400'}`}>
            {s.label}
          </span>
        </div>
      ))}
    </div>
  )
}

function WorkerStep({ workers, selected, onSelect }: {
  workers: Worker[]
  selected: Worker | null
  onSelect: (w: Worker) => void
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-gray-800">作業者を選んでください</h2>
      <div className="grid grid-cols-2 gap-3">
        {workers.map(w => (
          <button
            key={w.id}
            onClick={() => onSelect(w)}
            className={`py-5 px-4 rounded-xl text-xl font-bold border-2 transition-colors
              ${selected?.id === w.id
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-800 border-gray-200 active:bg-green-50'}`}
          >
            {w.name}
          </button>
        ))}
      </div>
    </div>
  )
}

function DatetimeStep({ workDate, startTime, endTime, weather, onDateChange, onStartChange, onEndChange, onWeatherChange, onNext, onBack }: {
  workDate: string; startTime: string; endTime: string; weather: string
  onDateChange: (v: string) => void; onStartChange: (v: string) => void
  onEndChange: (v: string) => void; onWeatherChange: (v: string) => void
  onNext: () => void; onBack: () => void
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-5 text-gray-800">日時・天候</h2>
      <div className="space-y-5">
        <div>
          <label className="block text-lg font-bold text-gray-700 mb-2">作業日</label>
          <input
            type="date"
            value={workDate}
            onChange={e => onDateChange(e.target.value)}
            className="w-full text-xl border-2 border-gray-300 rounded-xl px-4 py-3 bg-white"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-lg font-bold text-gray-700 mb-2">開始時刻</label>
            <select value={startTime} onChange={e => onStartChange(e.target.value)}
              className="w-full text-xl border-2 border-gray-300 rounded-xl px-3 py-3 bg-white">
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-lg font-bold text-gray-700 mb-2">終了時刻</label>
            <select value={endTime} onChange={e => onEndChange(e.target.value)}
              className="w-full text-xl border-2 border-gray-300 rounded-xl px-3 py-3 bg-white">
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-lg font-bold text-gray-700 mb-2">天候</label>
          <div className="grid grid-cols-3 gap-2">
            {WEATHER_OPTIONS.map(w => (
              <button key={w} onClick={() => onWeatherChange(w)}
                className={`py-3 rounded-xl text-base font-bold border-2 transition-colors
                  ${weather === w ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-gray-700 border-gray-200'}`}>
                {w}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onBack} className="flex-1 py-4 rounded-xl text-lg font-bold border-2 border-gray-300 text-gray-600 bg-white">
          戻る
        </button>
        <button onClick={onNext} className="flex-2 flex-grow-[2] py-4 rounded-xl text-xl font-bold bg-green-600 text-white">
          次へ
        </button>
      </div>
    </div>
  )
}

function WorkTypeStep({ categories, selected, onToggle, onNext, onBack }: {
  categories: (WorkCategory & { work_types: WorkType[] })[]
  selected: Set<string>
  onToggle: (id: string) => void
  onNext: () => void
  onBack: () => void
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-2 text-gray-800">作業内容を選んでください</h2>
      <p className="text-base text-gray-500 mb-4">複数選択できます</p>
      <div className="space-y-4">
        {categories.filter(c => c.work_types.length > 0).map(cat => (
          <div key={cat.id}>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2 border-b pb-1">
              {cat.name}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {cat.work_types.map(wt => (
                <button
                  key={wt.id}
                  onClick={() => onToggle(wt.id)}
                  className={`py-4 px-3 rounded-xl text-base font-bold border-2 transition-colors text-left flex items-center gap-2
                    ${selected.has(wt.id)
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-800 border-gray-200'}`}
                >
                  <span className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-xs
                    ${selected.has(wt.id) ? 'bg-white text-green-600' : 'border-2 border-gray-300'}`}>
                    {selected.has(wt.id) ? '✓' : ''}
                  </span>
                  {wt.name}
                  {wt.needs_pesticide && <span className="text-xs bg-orange-100 text-orange-700 px-1 rounded ml-auto">農薬</span>}
                  {wt.needs_fertilizer && <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded ml-auto">施肥</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onBack} className="flex-1 py-4 rounded-xl text-lg font-bold border-2 border-gray-300 text-gray-600 bg-white">
          戻る
        </button>
        <button
          onClick={onNext}
          disabled={selected.size === 0}
          className="flex-2 flex-grow-[2] py-4 rounded-xl text-xl font-bold bg-green-600 text-white disabled:opacity-40"
        >
          次へ ({selected.size}件)
        </button>
      </div>
    </div>
  )
}

function PesticideStep({ pesticides, entries, onAdd, onRemove, onChange, onNext, onBack }: {
  pesticides: Pesticide[]
  entries: PesticideEntry[]
  onAdd: () => void
  onRemove: (i: number) => void
  onChange: (i: number, field: keyof PesticideEntry, val: string) => void
  onNext: () => void
  onBack: () => void
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-2 text-gray-800">農薬使用記録</h2>
      <p className="text-sm text-orange-600 font-bold mb-4">※法定記録項目です</p>
      {entries.length === 0 && (
        <p className="text-base text-gray-500 mb-4">農薬を追加してください</p>
      )}
      {entries.map((e, i) => (
        <div key={i} className="bg-white border-2 border-orange-200 rounded-xl p-4 mb-4">
          <div className="flex justify-between items-center mb-3">
            <span className="font-bold text-gray-700">農薬 {i + 1}</span>
            <button onClick={() => onRemove(i)} className="text-red-500 text-sm font-bold min-h-0 h-auto">削除</button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">農薬名 *</label>
              <select value={e.pesticide_id} onChange={ev => onChange(i, 'pesticide_id', ev.target.value)}
                className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-base bg-white">
                {pesticides.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">希釈倍率 *</label>
                <input type="text" value={e.dilution_ratio} onChange={ev => onChange(i, 'dilution_ratio', ev.target.value)}
                  placeholder="例: 1000倍"
                  className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-base" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">使用量 *</label>
                <div className="flex gap-1">
                  <input type="number" value={e.amount_used} onChange={ev => onChange(i, 'amount_used', ev.target.value)}
                    placeholder="0.0"
                    className="flex-1 border-2 border-gray-300 rounded-lg px-2 py-2 text-base" />
                  <select value={e.amount_unit} onChange={ev => onChange(i, 'amount_unit', ev.target.value)}
                    className="border-2 border-gray-300 rounded-lg px-2 py-2 text-base bg-white">
                    <option>L</option><option>mL</option><option>kg</option><option>g</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">散布面積</label>
                <div className="flex gap-1">
                  <input type="number" value={e.spray_area} onChange={ev => onChange(i, 'spray_area', ev.target.value)}
                    placeholder="0.0"
                    className="flex-1 border-2 border-gray-300 rounded-lg px-2 py-2 text-base" />
                  <span className="flex items-center text-sm text-gray-600 px-1">a</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">対象病害虫</label>
                <input type="text" value={e.target_pest} onChange={ev => onChange(i, 'target_pest', ev.target.value)}
                  placeholder="例: いもち病"
                  className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-base" />
              </div>
            </div>
          </div>
        </div>
      ))}
      <button onClick={onAdd}
        className="w-full py-4 rounded-xl text-lg font-bold border-2 border-dashed border-orange-300 text-orange-600 bg-orange-50 mb-4">
        ＋ 農薬を追加
      </button>
      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-4 rounded-xl text-lg font-bold border-2 border-gray-300 text-gray-600 bg-white">
          戻る
        </button>
        <button onClick={onNext} className="flex-2 flex-grow-[2] py-4 rounded-xl text-xl font-bold bg-green-600 text-white">
          次へ
        </button>
      </div>
    </div>
  )
}

function FertilizerStep({ fertilizers, entries, onAdd, onRemove, onChange, onNext, onBack }: {
  fertilizers: Fertilizer[]
  entries: FertilizerEntry[]
  onAdd: () => void
  onRemove: (i: number) => void
  onChange: (i: number, field: keyof FertilizerEntry, val: string) => void
  onNext: () => void
  onBack: () => void
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-gray-800">施肥記録</h2>
      {entries.length === 0 && (
        <p className="text-base text-gray-500 mb-4">肥料を追加してください</p>
      )}
      {entries.map((e, i) => (
        <div key={i} className="bg-white border-2 border-blue-200 rounded-xl p-4 mb-4">
          <div className="flex justify-between items-center mb-3">
            <span className="font-bold text-gray-700">肥料 {i + 1}</span>
            <button onClick={() => onRemove(i)} className="text-red-500 text-sm font-bold min-h-0 h-auto">削除</button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">肥料名</label>
              <select value={e.fertilizer_id} onChange={ev => onChange(i, 'fertilizer_id', ev.target.value)}
                className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-base bg-white">
                {fertilizers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">使用量</label>
                <div className="flex gap-1">
                  <input type="number" value={e.amount_used} onChange={ev => onChange(i, 'amount_used', ev.target.value)}
                    placeholder="0.0"
                    className="flex-1 border-2 border-gray-300 rounded-lg px-2 py-2 text-base" />
                  <select value={e.amount_unit} onChange={ev => onChange(i, 'amount_unit', ev.target.value)}
                    className="border-2 border-gray-300 rounded-lg px-2 py-2 text-base bg-white">
                    <option>kg</option><option>L</option><option>g</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">施肥方法</label>
                <select value={e.method} onChange={ev => onChange(i, 'method', ev.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-base bg-white">
                  <option>元肥</option><option>追肥</option><option>葉面散布</option><option>その他</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      ))}
      <button onClick={onAdd}
        className="w-full py-4 rounded-xl text-lg font-bold border-2 border-dashed border-blue-300 text-blue-600 bg-blue-50 mb-4">
        ＋ 肥料を追加
      </button>
      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-4 rounded-xl text-lg font-bold border-2 border-gray-300 text-gray-600 bg-white">
          戻る
        </button>
        <button onClick={onNext} className="flex-2 flex-grow-[2] py-4 rounded-xl text-xl font-bold bg-green-600 text-white">
          次へ
        </button>
      </div>
    </div>
  )
}

function ConfirmStep({ field, worker, workDate, startTime, endTime, weather, selectedWorkTypes, workCategories, pesticideEntries, pesticides, fertilizerEntries, fertilizers, notes, onNotesChange, onSave, onBack, saving }: {
  field: Field; worker: Worker; workDate: string; startTime: string; endTime: string; weather: string
  selectedWorkTypes: Set<string>
  workCategories: (WorkCategory & { work_types: WorkType[] })[]
  pesticideEntries: PesticideEntry[]; pesticides: Pesticide[]
  fertilizerEntries: FertilizerEntry[]; fertilizers: Fertilizer[]
  notes: string; onNotesChange: (v: string) => void
  onSave: () => void; onBack: () => void; saving: boolean
}) {
  const allWorkTypes = workCategories.flatMap(c => c.work_types)
  const selectedNames = Array.from(selectedWorkTypes).map(id => allWorkTypes.find(w => w.id === id)?.name).filter(Boolean)

  return (
    <div>
      <h2 className="text-2xl font-bold mb-5 text-gray-800">内容を確認してください</h2>
      <div className="bg-white rounded-xl border-2 border-gray-200 divide-y divide-gray-100">
        <Row label="圃場" value={field.name} />
        <Row label="作業者" value={worker.name} />
        <Row label="作業日" value={workDate} />
        <Row label="作業時間" value={`${startTime} 〜 ${endTime}`} />
        <Row label="天候" value={weather} />
        <Row label="作業内容" value={selectedNames.join('、')} />
        {pesticideEntries.length > 0 && (
          <div className="px-4 py-3">
            <p className="text-sm font-bold text-gray-500 mb-1">農薬使用</p>
            {pesticideEntries.map((e, i) => {
              const p = pesticides.find(p => p.id === e.pesticide_id)
              return <p key={i} className="text-base">{p?.name} / {e.dilution_ratio} / {e.amount_used}{e.amount_unit}</p>
            })}
          </div>
        )}
        {fertilizerEntries.length > 0 && (
          <div className="px-4 py-3">
            <p className="text-sm font-bold text-gray-500 mb-1">施肥</p>
            {fertilizerEntries.map((e, i) => {
              const f = fertilizers.find(f => f.id === e.fertilizer_id)
              return <p key={i} className="text-base">{f?.name} / {e.amount_used}{e.amount_unit} / {e.method}</p>
            })}
          </div>
        )}
      </div>
      <div className="mt-4">
        <label className="block text-lg font-bold text-gray-700 mb-2">備考（任意）</label>
        <textarea
          value={notes}
          onChange={e => onNotesChange(e.target.value)}
          placeholder="特記事項があれば入力してください"
          rows={3}
          className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-base"
          style={{ minHeight: 'auto' }}
        />
      </div>
      <div className="flex gap-3 mt-5">
        <button onClick={onBack} className="flex-1 py-4 rounded-xl text-lg font-bold border-2 border-gray-300 text-gray-600 bg-white">
          戻る
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex-2 flex-grow-[2] py-4 rounded-xl text-xl font-bold bg-green-600 text-white disabled:opacity-60"
        >
          {saving ? '保存中...' : '✅ 保存する'}
        </button>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex px-4 py-3">
      <span className="text-sm font-bold text-gray-500 w-24 flex-shrink-0">{label}</span>
      <span className="text-base text-gray-800">{value}</span>
    </div>
  )
}
