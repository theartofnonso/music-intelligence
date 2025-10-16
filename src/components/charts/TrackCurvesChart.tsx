"use client"

import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

type Point = {
  second: number
  valence: number // [-1,1]
  arousal: number // [0,1]
}

export function TrackCurvesChart({ data }: { data: Point[] }) {
  const fmt = (s: number) => `${Math.round(s)}s`
  return (
    <div className="w-full">
      <div className="h-[220px] w-full rounded border">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 12, right: 12, bottom: 8, left: 12 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="second" tickFormatter={fmt} fontSize={10} stroke="#777" />
            <YAxis yAxisId="valence" domain={[-1, 1]} ticks={[-1, -0.5, 0, 0.5, 1]} width={28} fontSize={10} stroke="#777" />
            <YAxis yAxisId="arousal" orientation="right" domain={[0, 1]} ticks={[0, 0.5, 1]} width={28} fontSize={10} stroke="#777" />
            <Tooltip formatter={(v: any, n: any) => [typeof v === 'number' ? v.toFixed(2) : v, n]} labelFormatter={(l) => fmt(Number(l))} />
            {/* Valence area (centered) */}
            <Area type="monotone" yAxisId="valence" dataKey="valence" stroke="#16a34a" fill="#16a34a22" strokeWidth={2} dot={false} />
            {/* Arousal area */}
            <Area type="monotone" yAxisId="arousal" dataKey="arousal" stroke="#3b82f6" fill="#3b82f622" strokeWidth={2} dot={false} />
            {/* Only valence & arousal areas */}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-[#16a34a]" /> Valence</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-[#3b82f6]" /> Arousal</span>
      </div>
    </div>
  )
}

export default TrackCurvesChart


