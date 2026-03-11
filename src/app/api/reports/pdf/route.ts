import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { ReportDocument } from '@/lib/pdf/report-template'

export async function POST(req: NextRequest) {
  try {
    const { farm_id, from, to } = await req.json()
    if (!farm_id || !from || !to) return NextResponse.json({ error: '必須パラメータ不足' }, { status: 400 })

    const supabase = createServerClient()

    const [farmRes, logsRes] = await Promise.all([
      supabase.from('farms').select('*').eq('id', farm_id).single(),
      supabase.from('work_logs')
        .select(`*, workers(name), fields(name, area), work_log_items(work_types(name)), pesticide_uses(*, pesticides(name, registration_number)), fertilizer_uses(*, fertilizers(name, type))`)
        .eq('farm_id', farm_id)
        .gte('work_date', from)
        .lte('work_date', to)
        .order('work_date')
        .order('created_at'),
    ])

    const farm = farmRes.data
    const logs = logsRes.data || []

    if (!farm) return NextResponse.json({ error: '農場が見つかりません' }, { status: 404 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(
      React.createElement(ReportDocument as React.ComponentType<any>, { farm, from, to, logs })
    )

    return new NextResponse(Buffer.from(pdfBuffer) as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="report_${from}_${to}.pdf"`,
      },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'PDF生成エラー' }, { status: 500 })
  }
}
