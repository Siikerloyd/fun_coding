import { useState } from 'react'
import TopBar from './components/TopBar'
import Timer from './components/Timer'

function App() {
  const [isActive, setIsActive] = useState(false)
  const [isAlarm, setIsAlarm] = useState(false)

  return (
    <div className="w-screen h-screen min-h-0 p-1 box-border bg-transparent flex flex-col justify-center items-center overflow-hidden">
      {/* Glassmorphism Floating Card */}
      <div
        className={`w-full h-full min-h-0 rounded-2xl flex flex-col overflow-hidden transition-all duration-300 glass-card ${
          isAlarm
            ? 'border-rose-400/30 shadow-[0_0_20px_rgba(244,114,114,0.25)]'
            : isActive
              ? 'border-emerald-400/30 shadow-[0_0_20px_rgba(52,211,127,0.25)]'
              : 'border-white/6'
        }`}
      >
        <TopBar isActive={isActive} isAlarm={isAlarm} />
        <Timer
          isActive={isActive}
          setIsActive={setIsActive}
          isAlarm={isAlarm}
          setIsAlarm={setIsAlarm}
        />
      </div>
    </div>
  )
}

export default App
