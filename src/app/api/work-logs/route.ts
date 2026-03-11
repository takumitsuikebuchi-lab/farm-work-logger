import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      farm_id, field_id, worker_id, work_date, start_time, end_time,
      weather, weather_source, notes, work_type_ids, pesticide_uses, fertilizer_uses,
    } = body

    if (!farm_id || !field_id || !worker_id || !work_date || !work_type_ids?.length) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
    }

    const supabase = createServerClient()

    // 作業記録を保存
    const { data: workLog, error: logErr } = await supabase
      .from('work_logs')
      .insert({ farm_id, field_id, worker_id, work_date, start_time, end_time, weather, weather_source: weather_source || 'manual', notes })
      .select()
      .single()

    if (logErr || !workLog) {
      console.error(logErr)
      return NextResponse.json({ error: '作業記録の保存に失敗しました' }, { status: 500 })
    }

    // 作業項目を保存
    await supabase.from('work_log_items').insert(
      work_type_ids.map((id: string) => ({ work_log_id: workLog.id, work_type_id: id }))
    )

    // 農薬使用記録を保存
    if (pesticide_uses?.length) {
      await supabase.from('pesticide_uses').insert(
        pesticide_uses.map((p: Record<string, unknown>) => ({ work_log_id: workLog.id, ...p }))
      )
    }

    // 施肥記録を保存
    if (fertilizer_uses?.length) {
      await supabase.from('fertilizer_uses').insert(
        fertilizer_uses.map((f: Record<string, unknown>) => ({ work_log_id: workLog.id, ...f }))
      )
    }

    return NextResponse.json({ id: workLog.id }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
