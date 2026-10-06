"use client"

import ContributionSkyline, { generateContributions, ContributionDay } from "@/components/ui/contribution-skyline"
import { useMemo, useState, useEffect } from "react"
import { BugIcon, ShieldAlertIcon } from "lucide-react"

export default function SimulatorPage() {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  const data = useMemo<ContributionDay[]>(() => {
    if (!mounted) return []
    const today = Date.now()
    const raw = generateContributions(today, 88, 365) // random seed
    return raw.map((d) => ({
      date: d.date,
      count: d.count === 0 ? 0 : Math.floor(d.count * 1200 + Math.random() * 500) // Scale to look like massive outbreak cases
    }))
  }, [mounted])

  if (!mounted) return null

  return (
    <div className="w-full bg-zinc-950 min-h-screen px-4 py-10 sm:px-8 text-white flex flex-col items-center justify-center font-sans">
      <div className="mx-auto w-full max-w-[1000px]">
        
        <div className="flex flex-col items-center justify-center mb-10 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <ShieldAlertIcon className="w-10 h-10 text-red-600 animate-pulse" />
            <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-800 tracking-tight">
              Global Mosquito Outbreak Simulator
            </h1>
            <BugIcon className="w-10 h-10 text-red-600 animate-pulse" />
          </div>
          <p className="text-zinc-400 max-w-2xl text-lg leading-relaxed">
            3D visualization of worldwide mosquito-borne disease outbreak severity over the past year. 
            The isometric heat map identifies massive infection spikes across various global regions in real-time.
          </p>
        </div>
        
        <div className="p-1 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 shadow-[0_0_50px_rgba(220,38,38,0.15)] ring-1 ring-zinc-800">
          <ContributionSkyline 
            data={data}
            palette="danger"
            unit="case"
            unitPlural="cases"
            title={
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping absolute"></span>
                <span className="w-2 h-2 rounded-full bg-red-500 relative"></span>
                <span className="font-bold text-zinc-100 tracking-wide uppercase text-xs">Live Global Tracker</span>
              </div>
            }
            className="border-zinc-800/50 bg-zinc-950/50 backdrop-blur-sm"
          />
        </div>

      </div>
    </div>
  )
}
