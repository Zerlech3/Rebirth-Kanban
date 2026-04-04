'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
  ResponsiveContainer, Legend,
} from 'recharts'
import { useMemo } from 'react'
import { AlertTriangle, CheckCircle, Layers, TrendingUp } from 'lucide-react'
import { subDays } from 'date-fns'

interface ReportCard {
  id: string
  priority: string
  is_archived: boolean
  due_date_end: string | null
  created_at: string
  list_id: string
  lists: { title: string; board_id: string } | null
}

interface ReportMember {
  user_id: string
  cards: { id: string; is_archived: boolean } | null
  users: { full_name: string } | null
}

interface ReportsClientProps {
  cards: ReportCard[]
  members: ReportMember[]
}

const PRIORITY_COLORS: Record<string, string> = {
  low: '#22c55e',
  normal: '#3b82f6',
  high: '#f97316',
  urgent: '#ef4444',
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Düşük',
  normal: 'Normal',
  high: 'Yüksek',
  urgent: 'Acil',
}

export default function ReportsClient({ cards, members }: ReportsClientProps) {
  const now = new Date()
  const sevenDaysAgo = subDays(now, 7)

  const activeCards = useMemo(() => cards.filter((c) => !c.is_archived), [cards])

  const overdueCards = useMemo(
    () => activeCards.filter((c) => c.due_date_end && new Date(c.due_date_end) < now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeCards]
  )

  const recentCompletions = useMemo(
    () =>
      activeCards.filter(
        (c) =>
          c.due_date_end &&
          new Date(c.due_date_end) >= sevenDaysAgo &&
          new Date(c.due_date_end) <= now
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeCards]
  )

  const priorityData = useMemo(() => {
    const counts: Record<string, number> = { low: 0, normal: 0, high: 0, urgent: 0 }
    activeCards.forEach((c) => {
      if (counts[c.priority] !== undefined) counts[c.priority]++
    })
    return Object.entries(counts).map(([key, value]) => ({
      name: PRIORITY_LABELS[key],
      value,
      color: PRIORITY_COLORS[key],
    }))
  }, [activeCards])

  const memberWorkload = useMemo(() => {
    const counts: Record<string, { name: string; count: number }> = {}
    members.forEach((m) => {
      if (!m.users || !m.cards || m.cards.is_archived) return
      const name = m.users.full_name || m.user_id
      if (!counts[m.user_id]) {
        counts[m.user_id] = { name, count: 0 }
      }
      counts[m.user_id].count++
    })
    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [members])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Raporlar</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryCard
          icon={<Layers className="w-5 h-5 text-blue-500" />}
          label="Aktif Kartlar"
          value={activeCards.length}
          bg="bg-blue-50 dark:bg-blue-900/20"
        />
        <SummaryCard
          icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
          label="Geciken Kartlar"
          value={overdueCards.length}
          bg="bg-red-50 dark:bg-red-900/20"
        />
        <SummaryCard
          icon={<CheckCircle className="w-5 h-5 text-green-500" />}
          label="Son 7 Günde Tamamlanan"
          value={recentCompletions.length}
          bg="bg-green-50 dark:bg-green-900/20"
        />
        <SummaryCard
          icon={<TrendingUp className="w-5 h-5 text-purple-500" />}
          label="Toplam Atama"
          value={members.length}
          bg="bg-purple-50 dark:bg-purple-900/20"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Priority Pie Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Önceliğe Göre Kartlar</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={priorityData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {priorityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Member Workload Bar Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Üye İş Yükü</h2>
          {memberWorkload.length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-gray-400 text-sm">
              Veri bulunamadı
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={memberWorkload} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={90}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Kart Sayısı" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Overdue Cards List */}
      {overdueCards.length > 0 && (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">
            Geciken Kartlar ({overdueCards.length})
          </h2>
          <div className="space-y-2">
            {overdueCards.slice(0, 10).map((card) => (
              <div
                key={card.id}
                className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: PRIORITY_COLORS[card.priority] }}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-200">{card.id.slice(0, 8)}…</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{PRIORITY_LABELS[card.priority]}</span>
                  {card.due_date_end && (
                    <span className="text-red-500">
                      {new Date(card.due_date_end).toLocaleDateString('tr-TR')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode
  label: string
  value: number
  bg: string
}) {
  return (
    <div className={`rounded-xl p-4 ${bg}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
      </div>
      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  )
}
