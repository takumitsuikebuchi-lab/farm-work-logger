import Link from 'next/link'

export default function FarmLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ farmSlug: string }>
}) {
  return <>{children}</>
}
