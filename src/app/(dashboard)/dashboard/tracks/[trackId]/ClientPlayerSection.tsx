"use client"

import SimpleWavePlayer from '@/components/player/SimpleWavePlayer'

export default function ClientPlayerSection({ src }: { src: string }) {
  return <SimpleWavePlayer src={src} />
}


