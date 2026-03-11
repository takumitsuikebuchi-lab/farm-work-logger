import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// 気象庁APIの天気コード → 日本語テキスト変換
function weatherCodeToJapanese(code: number): string {
  if (code === 800) return '晴'
  if (code >= 801 && code <= 804) return '曇'
  if (code >= 300 && code < 600) return '雨'
  if (code >= 600 && code < 700) return '雪'
  if (code >= 200 && code < 300) return '雨'
  return '曇'
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const farmId = searchParams.get('farm_id')

  if (!farmId) {
    return NextResponse.json({ weather: null }, { status: 400 })
  }

  try {
    const supabase = createServerClient()
    const { data: farm } = await supabase
      .from('farms')
      .select('latitude, longitude')
      .eq('id', farmId)
      .single()

    if (!farm?.latitude || !farm?.longitude) {
      return NextResponse.json({ weather: null })
    }

    const apiKey = process.env.OPENWEATHERMAP_API_KEY
    if (!apiKey) return NextResponse.json({ weather: null })

    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${farm.latitude}&lon=${farm.longitude}&appid=${apiKey}`,
      { next: { revalidate: 1800 } }
    )

    if (!res.ok) return NextResponse.json({ weather: null })

    const data = await res.json()
    const code = data.weather?.[0]?.id ?? 800
    const weather = weatherCodeToJapanese(code)

    return NextResponse.json({ weather })
  } catch {
    return NextResponse.json({ weather: null })
  }
}
