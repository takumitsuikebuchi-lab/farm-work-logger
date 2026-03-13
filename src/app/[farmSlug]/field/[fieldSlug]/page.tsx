'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Field, Worker, WorkCategory, WorkType, Pesticide, Fertilizer, Crop } from '@/lib/types'

// 天候の選択肢（絵文字付き）
const WEATHER_OPTIONS = [
  { label: '晴', emoji: '☀️' },
  { label: '曇', emoji: '☁️' },
  { label: '雨', emoji: '🌧' },
  { label: '雪', emoji: '❄️' },
  { label: '晴れ時々曇', emoji: '⛅' },
  { label: '曇り時々雨', emoji: '🌦' },
] as const

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

// ステップ→表示インデックスのマッピング
const STEP_TO_DISPLAY_IDX: Record<string, number> = {
  worker: 0,
  datetime: 1,
  worktype: 2,
  pesticide: 2,
  fertilizer: 2,
  confirm: 3,
}

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
      const { data: fieldData, error: fieldErr } = await supabase
        .from('fields')
        .select('*, crops(*)')
        .eq('qr_slug', fieldSlug)
        .single()
      if (fieldErr || !fieldData) throw new Error('圃場が見つかりません')

      const { data: farmData, error: farmErr } = await supabase
        .from('farms')
        .select('id, slug')
        .eq('id', fieldData.farm_id)
        .single()
      if (farmErr || farmData.slug !== farmSlug) throw new Error('農場が見つかりません')

      const farmId = fieldData.farm_id

      const [workersRes, categoriesRes, workTypesRes, pesticidesRes, fertilizersRes] = await Promise.all([
        supabase.from('workers').select('*').eq('farm_id', farmId).eq('active', true).order('name'),
        supabase.from('work_categories').select('*').eq('farm_id', farmId).order('sort_order'),
        supabase.from('work_types').select('*').eq('farm_id', farmId).order('sort_order'),
        supabase.from('pesticides').select('*').eq('farm_id', farmId).order('name'),
        supabase.from('fertilizers').select('*').eq('farm_id', farmId).order('name'),
      ])

      const categoriesWithTypes = (categoriesRes.data || []).map(cat => ({
        ...cat,
        work_types: (workTypesRes.data || []).filter(wt => wt.category_id === cat.id),
      }))

      setField(fieldData as Field & { crop?: Crop })
      setWorkers(workersRes.data || [])
      setWorkCategories(categoriesWithTypes)
      setPesticides(pesticidesRes.data || [])
      setFertilizers(fertilizersRes.data || [])

      fetch(`/api/weather?farm_id=${farmId}`)
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
    <div className="min-h-screen flex flex-col" style={{ background: '#EFF9F3' }}>
      {/* ヘッダー */}
      <div className="text-white px-5 pt-10 pb-12 relative"
        style={{ background: 'linear-gradient(145deg, #1a8c50 0%, #2aba6e 60%, #56d48e 100%)' }}>
        <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-2" style={{ opacity: 0.6 }}>
          農作業記録
        </p>
        <h1 className="text-3xl font-bold leading-snug">{field.name}</h1>
        {field.crop && (
          <span className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.15)' }}>
            🌱 {field.crop.name}
          </span>
        )}
        {/* 下部の丸み */}
        <div className="absolute -bottom-px left-0 right-0 h-7 rounded-t-3xl" style={{ background: '#EFF9F3' }} />
      </div>

      <div className="flex-1 px-4 pt-4 pb-10 max-w-lg mx-auto w-full">
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
            <StepIndicator step={step} />

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
// ローディング・エラー
// ========================================

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#EFF9F3' }}>
      <div className="w-12 h-12 rounded-full border-4 border-green-200 border-t-green-600 animate-spin" />
      <p className="text-lg text-gray-500 font-medium">読み込み中...</p>
    </div>
  )
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#EFF9F3' }}>
      <div className="bg-white rounded-3xl shadow-sm p-8 text-center w-full max-w-sm">
        <div className="text-5xl mb-4">⚠️</div>
        <p className="text-xl font-bold text-gray-800 mb-2">エラー</p>
        <p className="text-base text-gray-500">{message}</p>
      </div>
    </div>
  )
}

// ========================================
// 完了画面
// ========================================

function DoneScreen({ onAnother }: { onAnother: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center text-5xl mb-6 shadow-sm">
        ✅
      </div>
      <h2 className="text-3xl font-bold text-gray-900 mb-2">保存しました</h2>
      <p className="text-base text-gray-500 mb-12">作業記録を保存しました</p>
      <button
        onClick={onAnother}
        className="w-full text-white text-xl font-bold py-5 rounded-2xl shadow-md active:scale-[0.98] transition-transform"
        style={{ background: 'linear-gradient(135deg, #1a9455, #4ed88a)' }}
      >
        続けて記録する
      </button>
    </div>
  )
}

// ========================================
// ステップインジケーター
// ========================================

function StepIndicator({ step }: { step: Step }) {
  const steps = [
    { key: 'worker', label: '作業者' },
    { key: 'datetime', label: '日時' },
    { key: 'worktype', label: '作業内容' },
    { key: 'confirm', label: '確認' },
  ]
  const displayIdx = STEP_TO_DISPLAY_IDX[step] ?? 0

  return (
    <div className="flex items-start mb-8">
      {steps.map((s, i) => {
        const isCompleted = i < displayIdx
        const isActive = i === displayIdx
        return (
          <div key={s.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  isCompleted
                    ? 'text-white'
                    : isActive
                    ? 'text-white ring-4 ring-green-100'
                    : 'bg-white text-gray-400 border-2 border-gray-200'
                }`}
                style={
                  isCompleted || isActive
                    ? { background: 'linear-gradient(135deg, #1a9455, #4ed88a)' }
                    : {}
                }
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-xs mt-1.5 font-medium whitespace-nowrap ${
                  isActive ? 'text-green-700 font-bold' : isCompleted ? 'text-green-500' : 'text-gray-400'
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1.5 mb-5 rounded-full transition-all ${
                  i < displayIdx ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ========================================
// Step 1: 作業者選択
// ========================================

function WorkerStep({ workers, selected, onSelect }: {
  workers: Worker[]
  selected: Worker | null
  onSelect: (w: Worker) => void
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-1 text-gray-900">作業者を選んでください</h2>
      <p className="text-sm text-gray-400 mb-5">名前をタップしてください</p>
      <div className="grid grid-cols-2 gap-3">
        {workers.map(w => {
          const isSelected = selected?.id === w.id
          const initial = w.name.charAt(0)
          return (
            <button
              key={w.id}
              onClick={() => onSelect(w)}
              className="relative flex flex-col items-center gap-3 py-6 px-4 rounded-2xl border-2 transition-all active:scale-[0.97]"
              style={
                isSelected
                  ? {
                      background: 'linear-gradient(135deg, #1a9455, #4ed88a)',
                      borderColor: 'transparent',
                      boxShadow: '0 4px 20px rgba(26,148,85,0.28)',
                    }
                  : { background: '#fff', borderColor: '#e8ede9', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }
              }
            >
              {/* アバター */}
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold"
                style={
                  isSelected
                    ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                    : { background: 'linear-gradient(135deg, #b8f5d0, #8de8b4)', color: '#1a7a40' }
                }
              >
                {initial}
              </div>
              {/* 名前 */}
              <span
                className="text-lg font-bold leading-tight text-center"
                style={{ color: isSelected ? '#fff' : '#1a2e1f' }}
              >
                {w.name}
              </span>
              {/* 選択チェック */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/30 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ========================================
// Step 2: 日時・天候
// ========================================

function DatetimeStep({
  workDate, startTime, endTime, weather,
  onDateChange, onStartChange, onEndChange, onWeatherChange,
  onNext, onBack,
}: {
  workDate: string; startTime: string; endTime: string; weather: string
  onDateChange: (v: string) => void; onStartChange: (v: string) => void
  onEndChange: (v: string) => void; onWeatherChange: (v: string) => void
  onNext: () => void; onBack: () => void
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-1 text-gray-900">日時・天候</h2>
      <p className="text-sm text-gray-400 mb-5">作業の日時と天候を入力してください</p>
      <div className="space-y-3">

        {/* 作業日 */}
        <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <label className="block text-xs font-bold text-gray-400 tracking-widest uppercase mb-2">作業日</label>
          <input
            type="date"
            value={workDate}
            onChange={e => onDateChange(e.target.value)}
            className="w-full text-2xl font-bold text-gray-800 border-0 outline-none bg-transparent"
          />
        </div>

        {/* 作業時間 */}
        <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <label className="block text-xs font-bold text-gray-400 tracking-widest uppercase mb-3">作業時間</label>
          <div className="flex items-center gap-3">
            <select
              value={startTime}
              onChange={e => onStartChange(e.target.value)}
              className="flex-1 text-xl font-bold text-gray-800 border-0 outline-none bg-transparent"
            >
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <span className="text-gray-400 font-semibold">〜</span>
            <select
              value={endTime}
              onChange={e => onEndChange(e.target.value)}
              className="flex-1 text-xl font-bold text-gray-800 border-0 outline-none bg-transparent"
            >
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* 天候 */}
        <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <label className="block text-xs font-bold text-gray-400 tracking-widest uppercase mb-3">天候</label>
          <div className="grid grid-cols-3 gap-2">
            {WEATHER_OPTIONS.map(w => (
              <button
                key={w.label}
                onClick={() => onWeatherChange(w.label)}
                className="flex flex-col items-center gap-1 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.95]"
                style={
                  weather === w.label
                    ? { background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)', color: '#fff', boxShadow: '0 2px 8px rgba(14,165,233,0.3)' }
                    : { background: '#f8f9f7', color: '#6b7280' }
                }
              >
                <span className="text-2xl">{w.emoji}</span>
                <span className="text-xs font-bold">{w.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-5">
        <NavBack onClick={onBack} />
        <NavNext onClick={onNext} label="次へ" />
      </div>
    </div>
  )
}

// ========================================
// Step 3: 作業内容
// ========================================

function WorkTypeStep({ categories, selected, onToggle, onNext, onBack }: {
  categories: (WorkCategory & { work_types: WorkType[] })[]
  selected: Set<string>
  onToggle: (id: string) => void
  onNext: () => void
  onBack: () => void
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-1 text-gray-900">作業内容を選んでください</h2>
      <p className="text-sm text-gray-400 mb-5">複数選択できます</p>
      <div className="space-y-5">
        {categories.filter(c => c.work_types.length > 0).map(cat => (
          <div key={cat.id}>
            {/* カテゴリヘッダー */}
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-1 h-4 rounded-full" style={{ background: 'linear-gradient(135deg, #1a9455, #4ed88a)' }} />
              <h3 className="text-sm font-bold text-gray-500">{cat.name}</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {cat.work_types.map(wt => {
                const isSelected = selected.has(wt.id)
                return (
                  <button
                    key={wt.id}
                    onClick={() => onToggle(wt.id)}
                    className="relative flex flex-col items-start py-4 px-4 rounded-2xl border-2 transition-all active:scale-[0.97] text-left"
                    style={
                      isSelected
                        ? {
                            background: 'linear-gradient(135deg, #1a9455, #4ed88a)',
                            borderColor: 'transparent',
                            boxShadow: '0 3px 12px rgba(26,148,85,0.22)',
                          }
                        : { background: '#fff', borderColor: '#e8ede9', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }
                    }
                  >
                    <span
                      className="text-base font-bold leading-snug block"
                      style={{ color: isSelected ? '#fff' : '#1a2e1f' }}
                    >
                      {wt.name}
                    </span>
                    {(wt.needs_pesticide || wt.needs_fertilizer) && (
                      <div className="flex gap-1 mt-2">
                        {wt.needs_pesticide && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={
                              isSelected
                                ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                                : { background: '#fff3e0', color: '#d97706' }
                            }
                          >
                            農薬
                          </span>
                        )}
                        {wt.needs_fertilizer && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={
                              isSelected
                                ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                                : { background: '#e0f2fe', color: '#0284c7' }
                            }
                          >
                            施肥
                          </span>
                        )}
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-white/25 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-6">
        <NavBack onClick={onBack} />
        <NavNext
          onClick={onNext}
          disabled={selected.size === 0}
          label={selected.size > 0 ? `次へ（${selected.size}件）` : '次へ'}
        />
      </div>
    </div>
  )
}

// ========================================
// Step 農薬
// ========================================

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
      <h2 className="text-2xl font-bold mb-2 text-gray-900">農薬使用記録</h2>
      <span className="inline-block text-xs bg-orange-100 text-orange-700 font-bold px-2.5 py-1 rounded-full mb-5">
        法定記録項目
      </span>

      {entries.map((e, i) => (
        <div key={i} className="bg-white rounded-2xl overflow-hidden mb-4" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-orange-100" style={{ background: '#fff8f0' }}>
            <span className="font-bold text-orange-700 text-sm">農薬 {i + 1}</span>
            <button onClick={() => onRemove(i)} className="text-red-400 text-sm font-bold">削除</button>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-400 tracking-wide mb-1.5">農薬名 *</label>
              <select value={e.pesticide_id} onChange={ev => onChange(i, 'pesticide_id', ev.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-base font-medium"
                style={{ background: '#f8f9f7' }}>
                {pesticides.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-400 tracking-wide mb-1.5">希釈倍率 *</label>
                <input type="text" value={e.dilution_ratio} onChange={ev => onChange(i, 'dilution_ratio', ev.target.value)}
                  placeholder="例: 1000倍"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-base"
                  style={{ background: '#f8f9f7' }} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 tracking-wide mb-1.5">使用量 *</label>
                <div className="flex gap-1">
                  <input type="number" value={e.amount_used} onChange={ev => onChange(i, 'amount_used', ev.target.value)}
                    placeholder="0.0"
                    className="flex-1 border border-gray-200 rounded-xl px-2 py-2.5 text-base min-w-0"
                    style={{ background: '#f8f9f7' }} />
                  <select value={e.amount_unit} onChange={ev => onChange(i, 'amount_unit', ev.target.value)}
                    className="border border-gray-200 rounded-xl px-2 py-2.5 text-sm"
                    style={{ background: '#f8f9f7' }}>
                    <option>L</option><option>mL</option><option>kg</option><option>g</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-400 tracking-wide mb-1.5">散布面積</label>
                <div className="flex items-center gap-1">
                  <input type="number" value={e.spray_area} onChange={ev => onChange(i, 'spray_area', ev.target.value)}
                    placeholder="0.0"
                    className="flex-1 border border-gray-200 rounded-xl px-2 py-2.5 text-base min-w-0"
                    style={{ background: '#f8f9f7' }} />
                  <span className="text-sm text-gray-500 px-1">a</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 tracking-wide mb-1.5">対象病害虫</label>
                <input type="text" value={e.target_pest} onChange={ev => onChange(i, 'target_pest', ev.target.value)}
                  placeholder="例: いもち病"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-base"
                  style={{ background: '#f8f9f7' }} />
              </div>
            </div>
          </div>
        </div>
      ))}

      <button onClick={onAdd}
        className="w-full py-4 rounded-2xl text-base font-bold border-2 border-dashed border-orange-200 text-orange-600 mb-4 active:scale-[0.98] transition-transform"
        style={{ background: '#fff8f0' }}>
        ＋ 農薬を追加
      </button>

      <div className="flex gap-3">
        <NavBack onClick={onBack} />
        <NavNext onClick={onNext} label="次へ" />
      </div>
    </div>
  )
}

// ========================================
// Step 施肥
// ========================================

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
      <h2 className="text-2xl font-bold mb-1 text-gray-900">施肥記録</h2>
      <p className="text-sm text-gray-400 mb-5">使用した肥料を記録してください</p>

      {entries.map((e, i) => (
        <div key={i} className="bg-white rounded-2xl overflow-hidden mb-4" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-blue-100" style={{ background: '#f0f7ff' }}>
            <span className="font-bold text-blue-700 text-sm">肥料 {i + 1}</span>
            <button onClick={() => onRemove(i)} className="text-red-400 text-sm font-bold">削除</button>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-400 tracking-wide mb-1.5">肥料名</label>
              <select value={e.fertilizer_id} onChange={ev => onChange(i, 'fertilizer_id', ev.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-base font-medium"
                style={{ background: '#f8f9f7' }}>
                {fertilizers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-400 tracking-wide mb-1.5">使用量</label>
                <div className="flex gap-1">
                  <input type="number" value={e.amount_used} onChange={ev => onChange(i, 'amount_used', ev.target.value)}
                    placeholder="0.0"
                    className="flex-1 border border-gray-200 rounded-xl px-2 py-2.5 text-base min-w-0"
                    style={{ background: '#f8f9f7' }} />
                  <select value={e.amount_unit} onChange={ev => onChange(i, 'amount_unit', ev.target.value)}
                    className="border border-gray-200 rounded-xl px-2 py-2.5 text-sm"
                    style={{ background: '#f8f9f7' }}>
                    <option>kg</option><option>L</option><option>g</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 tracking-wide mb-1.5">施肥方法</label>
                <select value={e.method} onChange={ev => onChange(i, 'method', ev.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-base"
                  style={{ background: '#f8f9f7' }}>
                  <option>元肥</option><option>追肥</option><option>葉面散布</option><option>その他</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      ))}

      <button onClick={onAdd}
        className="w-full py-4 rounded-2xl text-base font-bold border-2 border-dashed border-blue-200 text-blue-600 mb-4 active:scale-[0.98] transition-transform"
        style={{ background: '#f0f7ff' }}>
        ＋ 肥料を追加
      </button>

      <div className="flex gap-3">
        <NavBack onClick={onBack} />
        <NavNext onClick={onNext} label="次へ" />
      </div>
    </div>
  )
}

// ========================================
// Step 確認
// ========================================

function ConfirmStep({
  field, worker, workDate, startTime, endTime, weather,
  selectedWorkTypes, workCategories,
  pesticideEntries, pesticides,
  fertilizerEntries, fertilizers,
  notes, onNotesChange,
  onSave, onBack, saving,
}: {
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

  const dateObj = new Date(workDate + 'T00:00:00')
  const dateFormatted = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日`

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1 text-gray-900">内容を確認</h2>
      <p className="text-sm text-gray-400 mb-5">内容を確認して保存してください</p>

      <div className="space-y-3">
        {/* 基本情報 */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div className="px-4 py-2.5 border-b border-gray-100" style={{ background: '#f8f9f7' }}>
            <p className="text-xs font-bold text-gray-400 tracking-widest uppercase">基本情報</p>
          </div>
          <div className="divide-y divide-gray-50">
            <ConfirmRow label="圃場" value={field.name} />
            <ConfirmRow label="作業者" value={worker.name} />
            <ConfirmRow label="作業日" value={dateFormatted} />
            <ConfirmRow label="時間" value={`${startTime} 〜 ${endTime}`} />
            <ConfirmRow label="天候" value={weather} />
          </div>
        </div>

        {/* 作業内容 */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div className="px-4 py-2.5 border-b border-gray-100" style={{ background: '#f8f9f7' }}>
            <p className="text-xs font-bold text-gray-400 tracking-widest uppercase">作業内容</p>
          </div>
          <div className="px-4 py-3 flex flex-wrap gap-2">
            {selectedNames.map((name, i) => (
              <span key={i} className="text-sm font-bold px-3 py-1.5 rounded-full"
                style={{ background: '#b8f5d0', color: '#155c30' }}>
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* 農薬 */}
        {pesticideEntries.length > 0 && (
          <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div className="px-4 py-2.5 border-b border-orange-100" style={{ background: '#fff8f0' }}>
              <p className="text-xs font-bold text-orange-500 tracking-widest uppercase">農薬使用</p>
            </div>
            <div className="divide-y divide-gray-50">
              {pesticideEntries.map((e, i) => {
                const p = pesticides.find(p => p.id === e.pesticide_id)
                return (
                  <div key={i} className="px-4 py-3">
                    <p className="font-bold text-gray-800">{p?.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">希釈 {e.dilution_ratio} / {e.amount_used}{e.amount_unit}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 施肥 */}
        {fertilizerEntries.length > 0 && (
          <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div className="px-4 py-2.5 border-b border-blue-100" style={{ background: '#f0f7ff' }}>
              <p className="text-xs font-bold text-blue-500 tracking-widest uppercase">施肥</p>
            </div>
            <div className="divide-y divide-gray-50">
              {fertilizerEntries.map((e, i) => {
                const f = fertilizers.find(f => f.id === e.fertilizer_id)
                return (
                  <div key={i} className="px-4 py-3">
                    <p className="font-bold text-gray-800">{f?.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{e.amount_used}{e.amount_unit} / {e.method}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 備考 */}
        <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <label className="block text-xs font-bold text-gray-400 tracking-widest uppercase mb-2">備考（任意）</label>
          <textarea
            value={notes}
            onChange={e => onNotesChange(e.target.value)}
            placeholder="特記事項があれば入力してください"
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-base resize-none"
            style={{ background: '#f8f9f7' }}
          />
        </div>
      </div>

      <div className="flex gap-3 mt-5">
        <NavBack onClick={onBack} />
        <button
          onClick={onSave}
          disabled={saving}
          className="flex-[2] py-5 rounded-2xl text-xl font-bold text-white shadow-md active:scale-[0.98] transition-transform disabled:opacity-60"
          style={{ background: saving ? '#4ed88a' : 'linear-gradient(135deg, #1a9455, #4ed88a)' }}
        >
          {saving ? '保存中...' : '保存する'}
        </button>
      </div>
    </div>
  )
}

// ========================================
// 共通コンポーネント
// ========================================

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center px-4 py-3 gap-3">
      <span className="text-xs font-bold text-gray-400 w-14 flex-shrink-0">{label}</span>
      <span className="text-base font-medium text-gray-800">{value}</span>
    </div>
  )
}

function NavBack({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-4 rounded-2xl text-base font-bold border-2 border-gray-200 text-gray-500 bg-white active:bg-gray-50"
    >
      戻る
    </button>
  )
}

function NavNext({ onClick, label, disabled }: { onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex-[2] py-4 rounded-2xl text-xl font-bold text-white shadow-sm active:scale-[0.98] transition-transform disabled:opacity-40 disabled:shadow-none"
      style={{ background: disabled ? '#9dd9b8' : 'linear-gradient(135deg, #1a9455, #4ed88a)' }}
    >
      {label}
    </button>
  )
}
