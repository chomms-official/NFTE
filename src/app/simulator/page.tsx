"use client"

import OutbreakGlobe from "@/components/ui/outbreak-globe"
import { ShieldAlertIcon, BugIcon } from "lucide-react"

export default function SimulatorPage() {
  return (
    <div className="w-full bg-zinc-950 min-h-screen px-4 py-8 sm:px-8 text-white flex flex-col items-center justify-start font-sans">
      <div className="mx-auto w-full max-w-[1400px] flex flex-col gap-8">
        
        {/* HEADER */}
        <div className="flex flex-col items-center justify-center text-center mt-4">
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
        
        {/* 3D INTERACTIVE GLOBE SECTION (Takes up massive space) */}
        <div className="w-full">
          <OutbreakGlobe />
        </div>

      </div>
    </div>
  )
}
