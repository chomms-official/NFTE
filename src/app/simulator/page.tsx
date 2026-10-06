"use client"

import ContributionSkyline, { generateContributions, ContributionDay } from "@/components/ui/contribution-skyline"
import OutbreakGlobe from "@/components/ui/outbreak-globe"
import { useMemo, useState, useEffect } from "react"
import { BugIcon, ShieldAlertIcon, GlobeIcon } from "lucide-react"

export default function SimulatorPage() {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  const skylineData = useMemo<ContributionDay[]>(() => {
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
    <div className="w-full bg-zinc-950 min-h-screen px-4 py-12 sm:px-8 text-white flex flex-col items-center justify-start font-sans">
      <div className="mx-auto w-full max-w-[1200px] flex flex-col gap-12">
        
        {/* HEADER */}
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <ShieldAlertIcon className="w-10 h-10 text-red-600 animate-pulse" />
            <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-800 tracking-tight drop-shadow-lg">
              Global Mosquito Outbreak Simulator
            </h1>
            <BugIcon className="w-10 h-10 text-red-600 animate-pulse" />
          </div>
          <p className="text-zinc-400 max-w-2xl text-lg leading-relaxed">
            Real-time interactive 3D mapping of worldwide mosquito-borne disease outbreaks.
            Rotate and zoom the globe to explore critical infection clusters globally.
          </p>
        </div>
        
        {/* 3D INTERACTIVE GLOBE SECTION */}
        <div className="flex flex-col w-full">
          <div className="flex items-center space-x-2 mb-4 pl-2">
            <GlobeIcon className="text-red-500 w-6 h-6" />
            <h2 className="text-2xl font-bold text-zinc-100">Live Interactive Globe</h2>
          </div>
          <OutbreakGlobe />
        </div>

        {/* 3D ISOMETRIC SKYLINE SECTION */}
        <div className="flex flex-col w-full">
          <div className="flex items-center space-x-2 mb-4 pl-2">
            <h2 className="text-2xl font-bold text-zinc-100">Annual Outbreak Trends</h2>
          </div>
          <div className="p-1 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 shadow-[0_0_50px_rgba(220,38,38,0.15)] ring-1 ring-zinc-800">
            <ContributionSkyline 
              data={skylineData}
              palette="danger"
              unit="case"
              unitPlural="cases"
              title={
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping absolute"></span>
                  <span className="w-2 h-2 rounded-full bg-red-500 relative"></span>
                  <span className="font-bold text-zinc-100 tracking-wide uppercase text-xs">Past 12 Months Heatmap</span>
                </div>
              }
              className="border-zinc-800/50 bg-zinc-950/50 backdrop-blur-sm"
            />
          </div>
        </div>

      </div>
    </div>
  )
}
