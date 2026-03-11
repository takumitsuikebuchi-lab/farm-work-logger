import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 9 },
  title: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 10, textAlign: 'center', marginBottom: 12, color: '#555555' },
  sectionHeader: { fontSize: 10, fontWeight: 'bold', backgroundColor: '#e8f5e9', padding: 4, marginTop: 10, marginBottom: 4 },
  table: { borderWidth: 1, borderColor: '#cccccc', borderStyle: 'solid' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#cccccc', borderBottomStyle: 'solid' },
  tableRowAlt: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#cccccc', borderBottomStyle: 'solid', backgroundColor: '#f9f9f9' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#4caf50', borderBottomWidth: 1, borderBottomColor: '#999999', borderBottomStyle: 'solid' },
  cell: { padding: 3, paddingLeft: 4, paddingRight: 4, borderRightWidth: 1, borderRightColor: '#cccccc', borderRightStyle: 'solid', fontSize: 8 },
  cellWhite: { color: 'white', padding: 3, paddingLeft: 4, paddingRight: 4, borderRightWidth: 1, borderRightColor: '#cccccc', borderRightStyle: 'solid', fontSize: 8, fontWeight: 'bold' },
  w10: { width: '10%' }, w12: { width: '12%' }, w15: { width: '15%' },
  w20: { width: '20%' }, w25: { width: '25%' }, w30: { width: '30%' },
  footer: { position: 'absolute', bottom: 20, left: 30, right: 30, fontSize: 7, color: '#999999', textAlign: 'center' },
  signBox: { marginTop: 20, borderWidth: 1, borderColor: '#cccccc', borderStyle: 'solid', padding: 8 },
  signRow: { flexDirection: 'row' },
  signCell: { flex: 1, borderWidth: 1, borderColor: '#cccccc', borderStyle: 'solid', padding: 6, minHeight: 30 },
  signLabel: { fontSize: 7, color: '#666666', marginBottom: 2 },
  note: { fontSize: 7, color: '#e65100', marginTop: 4 },
})

interface WorkLog {
  id: string
  work_date: string
  start_time?: string | null
  end_time?: string | null
  weather?: string | null
  notes?: string | null
  workers?: { name: string } | null
  fields?: { name: string; area?: number | null } | null
  work_log_items?: Array<{ work_types?: { name: string } | null }>
  pesticide_uses?: Array<{
    pesticides?: { name: string; registration_number?: string | null } | null
    dilution_ratio?: string | null
    amount_used?: number | null
    amount_unit?: string
    spray_area?: number | null
    spray_area_unit?: string
    target_pest?: string | null
  }>
  fertilizer_uses?: Array<{
    fertilizers?: { name: string; type?: string | null } | null
    amount_used?: number | null
    amount_unit?: string
    method?: string | null
  }>
}

interface ReportDocumentProps {
  farm: { name: string }
  from: string
  to: string
  logs: WorkLog[]
}

export function ReportDocument({ farm, from, to, logs }: ReportDocumentProps) {
  const hasPesticide = logs.some(l => l.pesticide_uses && l.pesticide_uses.length > 0)
  const hasFertilizer = logs.some(l => l.fertilizer_uses && l.fertilizer_uses.length > 0)
  const dateRange = from === to ? from : `${from} 〜 ${to}`

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>農作業日報</Text>
        <Text style={styles.subtitle}>{farm.name}　{dateRange}</Text>

        {/* 作業記録 */}
        <Text style={styles.sectionHeader}>■ 作業記録</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.cellWhite, styles.w12]}>日付</Text>
            <Text style={[styles.cellWhite, styles.w15]}>圃場名</Text>
            <Text style={[styles.cellWhite, styles.w12]}>作業者</Text>
            <Text style={[styles.cellWhite, styles.w10]}>時間</Text>
            <Text style={[styles.cellWhite, styles.w10]}>天候</Text>
            <Text style={[styles.cellWhite, styles.w30]}>作業内容</Text>
            <Text style={[styles.cellWhite, { flex: 1 }]}>備考</Text>
          </View>
          {logs.map((log, idx) => {
            const workItems = log.work_log_items
              ?.map(item => item.work_types?.name)
              .filter(Boolean).join('、') || ''
            const timeStr = log.start_time
              ? `${log.start_time.slice(0, 5)}〜${(log.end_time || '').slice(0, 5)}`
              : ''
            const RowStyle = idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt
            return (
              <View key={log.id} style={RowStyle}>
                <Text style={[styles.cell, styles.w12]}>{log.work_date}</Text>
                <Text style={[styles.cell, styles.w15]}>{log.fields?.name || ''}</Text>
                <Text style={[styles.cell, styles.w12]}>{log.workers?.name || ''}</Text>
                <Text style={[styles.cell, styles.w10]}>{timeStr}</Text>
                <Text style={[styles.cell, styles.w10]}>{log.weather || ''}</Text>
                <Text style={[styles.cell, styles.w30]}>{workItems}</Text>
                <Text style={[styles.cell, { flex: 1 }]}>{log.notes || ''}</Text>
              </View>
            )
          })}
        </View>

        {/* 農薬使用記録 */}
        {hasPesticide && (
          <>
            <Text style={styles.sectionHeader}>■ 農薬使用記録（法定記載事項）</Text>
            <Text style={styles.note}>※農薬取締法に基づく記録（3年間保存）</Text>
            <View style={[styles.table, { marginTop: 4 }]}>
              <View style={styles.tableHeader}>
                {['使用日', '圃場名', '農薬名', '登録番号', '希釈倍率', '使用量', '散布面積', '対象病害虫', '作業者'].map((h, i) => (
                  <Text key={i} style={[styles.cellWhite, styles.w10, i === 2 ? styles.w15 : {}]}>{h}</Text>
                ))}
              </View>
              {logs.flatMap(log =>
                (log.pesticide_uses || []).map((pu, i) => (
                  <View key={`${log.id}-p${i}`} style={styles.tableRow}>
                    <Text style={[styles.cell, styles.w10]}>{log.work_date}</Text>
                    <Text style={[styles.cell, styles.w10]}>{log.fields?.name || ''}</Text>
                    <Text style={[styles.cell, styles.w15]}>{pu.pesticides?.name || ''}</Text>
                    <Text style={[styles.cell, styles.w10]}>{pu.pesticides?.registration_number || ''}</Text>
                    <Text style={[styles.cell, styles.w10]}>{pu.dilution_ratio || ''}</Text>
                    <Text style={[styles.cell, styles.w10]}>{pu.amount_used != null ? `${pu.amount_used}${pu.amount_unit}` : ''}</Text>
                    <Text style={[styles.cell, styles.w10]}>{pu.spray_area != null ? `${pu.spray_area}${pu.spray_area_unit}` : ''}</Text>
                    <Text style={[styles.cell, styles.w10]}>{pu.target_pest || ''}</Text>
                    <Text style={[styles.cell, { flex: 1 }]}>{log.workers?.name || ''}</Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {/* 施肥記録 */}
        {hasFertilizer && (
          <>
            <Text style={[styles.sectionHeader, { marginTop: 10 }]}>■ 施肥記録</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                {['施肥日', '圃場名', '肥料名', '種類', '使用量', '施肥方法', '作業者'].map((h, i) => (
                  <Text key={i} style={[styles.cellWhite, i === 2 ? styles.w25 : styles.w12]}>{h}</Text>
                ))}
              </View>
              {logs.flatMap(log =>
                (log.fertilizer_uses || []).map((fu, i) => (
                  <View key={`${log.id}-f${i}`} style={styles.tableRow}>
                    <Text style={[styles.cell, styles.w12]}>{log.work_date}</Text>
                    <Text style={[styles.cell, styles.w12]}>{log.fields?.name || ''}</Text>
                    <Text style={[styles.cell, styles.w25]}>{fu.fertilizers?.name || ''}</Text>
                    <Text style={[styles.cell, styles.w12]}>{fu.fertilizers?.type || ''}</Text>
                    <Text style={[styles.cell, styles.w12]}>{fu.amount_used != null ? `${fu.amount_used}${fu.amount_unit}` : ''}</Text>
                    <Text style={[styles.cell, styles.w15]}>{fu.method || ''}</Text>
                    <Text style={[styles.cell, { flex: 1 }]}>{log.workers?.name || ''}</Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {/* 署名欄 */}
        <View style={styles.signBox}>
          <View style={styles.signRow}>
            <View style={styles.signCell}><Text style={styles.signLabel}>責任者確認欄</Text></View>
            <View style={styles.signCell}><Text style={styles.signLabel}>作成日</Text></View>
            <View style={styles.signCell}><Text style={styles.signLabel}>提出先（JA等）</Text></View>
          </View>
        </View>

        <Text style={styles.footer}>
          農作業記録アプリ / {farm.name} / 出力日: {new Date().toLocaleDateString('ja-JP')}
        </Text>
      </Page>
    </Document>
  )
}
