'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Field, Farm } from '@/lib/types'
import QRCode from 'qrcode'

export default function QrCodesPage() {
  const params = useParams()
  const farmSlug = params.farmSlug as string

  const [farm, setFarm] = useState<Farm | null>(null)
  const [fields, setFields] = useState<Field[]>([])
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

  useEffect(() => {
    async function load() {
      const { data: farmData } = await supabase.from('farms').select('*').eq('slug', farmSlug).single()
      if (!farmData) return
      setFarm(farmData)
      const { data: fieldsData } = await supabase.from('fields').select('*').eq('farm_id', farmData.id).eq('active', true).order('name')
      setFields(fieldsData || [])

      // QRコードをURLから生成
      const urls: Record<string, string> = {}
      for (const f of fieldsData || []) {
        const url = `${appUrl}/${farmSlug}/field/${f.qr_slug}`
        urls[f.id] = await QRCode.toDataURL(url, { width: 200, margin: 1, errorCorrectionLevel: 'M' })
      }
      setQrDataUrls(urls)
      setLoading(false)
    }
    load()
  }, [farmSlug, appUrl])

  function handlePrint() {
    window.print()
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p className="text-xl">読み込み中...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 印刷時は非表示 */}
      <div className="print:hidden">
        <div className="bg-green-700 text-white px-6 py-5">
          <Link href={`/${farmSlug}/admin`} className="text-sm opacity-80 mb-1 block">← 管理メニュー</Link>
          <h1 className="text-2xl font-bold">QRコード印刷</h1>
          <p className="text-sm opacity-80">{farm?.name}</p>
        </div>
        <div className="px-4 py-6 max-w-2xl mx-auto">
          <p className="text-base text-gray-600 mb-4">
            「印刷する」ボタンを押してA4用紙に印刷してください。
            車やトラクターに常備しておくと便利です。
          </p>
          <button onClick={handlePrint}
            className="w-full bg-green-600 text-white text-xl font-bold py-4 rounded-xl mb-6">
            🖨️ 印刷する
          </button>
        </div>
      </div>

      {/* 印刷用コンテンツ */}
      <div className="px-6 py-4 print:px-4 print:py-2">
        <div className="print:hidden mb-2">
          <h2 className="text-xl font-bold text-gray-700">QRコード一覧（{farm?.name}）</h2>
        </div>
        <div className="hidden print:block text-center mb-4">
          <h2 className="text-2xl font-bold">{farm?.name} 圃場QRコード一覧</h2>
        </div>

        {/* QRコードグリッド（A4に4列×5行程度） */}
        <div className="grid grid-cols-3 gap-4 print:grid-cols-4 print:gap-3">
          {fields.map(f => (
            <div key={f.id} className="bg-white border-2 border-gray-200 rounded-xl p-3 flex flex-col items-center print:rounded-none print:border print:border-gray-400 print:p-2">
              {qrDataUrls[f.id] && (
                <img src={qrDataUrls[f.id]} alt={`QR: ${f.name}`} className="w-24 h-24 print:w-20 print:h-20" />
              )}
              <p className="text-sm font-bold text-gray-800 text-center mt-2 print:text-xs">{f.name}</p>
              {f.area && <p className="text-xs text-gray-500 print:text-xs">{f.area}a</p>}
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body { background: white; }
          .print\\:hidden { display: none !important; }
          .hidden.print\\:block { display: block !important; }
          .hidden.print\\:grid { display: grid !important; }
        }
      `}</style>
    </div>
  )
}
