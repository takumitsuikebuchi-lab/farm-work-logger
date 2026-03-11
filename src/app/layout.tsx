import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '農作業記録',
  description: '圃場の作業記録・日報管理アプリ',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  )
}
