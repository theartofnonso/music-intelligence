"use client"

import { cn } from "@/lib/utils"
import React, { useEffect, useRef, useState } from "react"
import { createNoise3D } from "simplex-noise"

export interface WavyBackgroundProps {
  children?: React.ReactNode
  className?: string
  containerClassName?: string
  colors?: string[]
  waveWidth?: number
  backgroundFill?: string
  blur?: number
  speed?: "slow" | "fast"
  waveOpacity?: number
}

export const WavyBackground = ({
  children,
  className,
  containerClassName,
  colors,
  waveWidth,
  backgroundFill = "white",
  blur = 10,
  speed = "fast",
  waveOpacity = 0.5,
}: WavyBackgroundProps) => {
  const [isSafari, setIsSafari] = useState(false)
  const [isClient, setIsClient] = useState(false)

  // Instance-scoped refs to avoid shared mutable state across component instances
  const noiseRef = useRef(createNoise3D())
  const wRef = useRef(0)
  const hRef = useRef(0)
  const ntRef = useRef(0)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const animationIdRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Keep latest values without re-initializing the canvas animation
  const speedRef = useRef<typeof speed>(speed)
  const waveOpacityRef = useRef<number>(waveOpacity)
  const colorsRef = useRef<string[] | undefined>(colors)
  const waveWidthRef = useRef<number | undefined>(waveWidth)
  const backgroundFillRef = useRef<string>(backgroundFill)
  const blurRef = useRef<number>(blur)

  useEffect(() => { speedRef.current = speed }, [speed])
  useEffect(() => { waveOpacityRef.current = waveOpacity }, [waveOpacity])
  useEffect(() => { colorsRef.current = colors }, [colors])
  useEffect(() => { waveWidthRef.current = waveWidth }, [waveWidth])
  useEffect(() => { backgroundFillRef.current = backgroundFill }, [backgroundFill])
  useEffect(() => { blurRef.current = blur }, [blur])

  const getSpeed = () => (speedRef.current === "slow" ? 0.001 : 0.002)

  const init = () => {
    if (!isClient) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctxRef.current = ctx
    wRef.current = (ctx.canvas.width = canvas.offsetWidth)
    hRef.current = (ctx.canvas.height = canvas.offsetHeight)
    ctx.filter = `blur(${blurRef.current}px)`
    ntRef.current = 0
    render()
  }

  const defaultColors = [
    "#38bdf8",
    "#818cf8",
    "#c084fc",
    "#e879f9",
    "#22d3ee",
  ]

  const drawWave = (n: number) => {
    const ctx = ctxRef.current
    if (!ctx) return
    ntRef.current += getSpeed()
    const w = wRef.current
    const h = hRef.current
    const noise = noiseRef.current
    for (let i = 0; i < n; i++) {
      ctx.beginPath()
      ctx.lineWidth = (waveWidthRef.current ?? 50)
      const currentColors = colorsRef.current && colorsRef.current.length > 0 ? colorsRef.current : defaultColors
      ctx.strokeStyle = currentColors[i % currentColors.length]!
      for (let x = 0; x < w; x += 5) {
        const y = noise(x / 800, 0.3 * i, ntRef.current) * 100
        ctx.lineTo(x, y + h * 0.5)
      }
      ctx.stroke()
      ctx.closePath()
    }
  }

  const render = () => {
    const ctx = ctxRef.current
    if (!ctx) return
    const w = wRef.current
    const h = hRef.current
    // Transparent background: clear canvas instead of painting
    if ((backgroundFillRef.current || "").toLowerCase() === "transparent") {
      ctx.clearRect(0, 0, w, h)
    } else {
      ctx.fillStyle = backgroundFillRef.current || "black"
      ctx.globalAlpha = waveOpacityRef.current || 0.5
      ctx.fillRect(0, 0, w, h)
    }
    // Draw waves with opacity (stroke alpha)
    ctx.globalAlpha = waveOpacityRef.current || 0.5
    drawWave(5)
    animationIdRef.current = requestAnimationFrame(render)
  }

  // Initialize once per mount; dynamic values are read from refs
  useEffect(() => {
    if (isClient) init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient])
  useEffect(() => {
    return () => {
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current)
      animationIdRef.current = null
    }
  }, [])

  // Attach a resize listener per instance; clean up on unmount
  useEffect(() => {
    if (!isClient) return
    const handleResize = () => {
      const canvas = canvasRef.current
      const ctx = ctxRef.current
      if (!canvas || !ctx) return
      wRef.current = (ctx.canvas.width = canvas.offsetWidth)
      hRef.current = (ctx.canvas.height = canvas.offsetHeight)
      ctx.filter = `blur(${blurRef.current}px)`
    }
    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [isClient])

  useEffect(() => {
    setIsClient(true)
    setIsSafari(
      typeof window !== "undefined" &&
        navigator.userAgent.includes("Safari") &&
        !navigator.userAgent.includes("Chrome")
    )
  }, [])

  return (
    <div
      className={cn(
        "relative w-full h-full flex flex-col items-center justify-center",
        containerClassName
      )}
    >
      <canvas
        className="absolute inset-0 z-0 w-full h-full"
        ref={canvasRef}
        id="canvas"
        style={{ ...(isClient && isSafari ? { filter: `blur(${blur}px)` } : {}) }}
      />
      <div className={cn("relative z-10", className)}>{children}</div>
    </div>
  )
}

export default WavyBackground


