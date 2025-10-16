"use client"

import React from 'react'

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'

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
          <LineChart data={data} margin={{ top: 12, right: 12, bottom: 8, left: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="second" tickFormatter={fmt} fontSize={10} stroke="#777" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis yAxisId="valence" domain={[-1, 1]} ticks={[-1, -0.5, 0, 0.5, 1]} width={28} fontSize={10} stroke="#777" tickLine={false} axisLine={false} />
            <YAxis yAxisId="arousal" orientation="right" domain={[0, 1]} ticks={[0, 0.5, 1]} width={28} fontSize={10} stroke="#777" tickLine={false} axisLine={false} />
            <Tooltip cursor={false} formatter={(v: any) => (typeof v === 'number' ? v.toFixed(2) : v)} labelFormatter={(l) => fmt(Number(l))} />
            <Line dataKey="valence" yAxisId="valence" type="monotone" stroke="#16a34a" strokeWidth={2} dot={false} />
            <Line dataKey="arousal" yAxisId="arousal" type="monotone" stroke="#3b82f6" strokeWidth={2} dot={false} />
          </LineChart>
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


