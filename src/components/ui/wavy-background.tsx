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

  const noise = createNoise3D()
  let w: number, h: number, nt: number, i: number, x: number
  let ctx: CanvasRenderingContext2D | null
  let canvas: HTMLCanvasElement | null
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
    canvas = canvasRef.current
    if (!canvas) return
    ctx = canvas.getContext("2d")
    if (!ctx) return
    w = (ctx.canvas.width = canvas.offsetWidth)
    h = (ctx.canvas.height = canvas.offsetHeight)
    ctx.filter = `blur(${blurRef.current}px)`
    nt = 0
    window.onresize = function () {
      if (!canvas || !ctx) return
      w = (ctx.canvas.width = canvas.offsetWidth)
      h = (ctx.canvas.height = canvas.offsetHeight)
      ctx.filter = `blur(${blurRef.current}px)`
    }
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
    if (!ctx) return
    nt += getSpeed()
    for (i = 0; i < n; i++) {
      ctx.beginPath()
      ctx.lineWidth = (waveWidthRef.current ?? 50)
      const currentColors = colorsRef.current && colorsRef.current.length > 0 ? colorsRef.current : defaultColors
      ctx.strokeStyle = currentColors[i % currentColors.length]!
      for (x = 0; x < w; x += 5) {
        const y = noise(x / 800, 0.3 * i, nt) * 100
        ctx.lineTo(x, y + h * 0.5)
      }
      ctx.stroke()
      ctx.closePath()
    }
  }

  let animationId: number
  const render = () => {
    if (!ctx) return
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
    animationId = requestAnimationFrame(render)
  }

  // Initialize once per mount; dynamic values are read from refs
  useEffect(() => {
    if (isClient) init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient])
  useEffect(() => {
    return () => { if (animationId) cancelAnimationFrame(animationId) }
  }, [])

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


