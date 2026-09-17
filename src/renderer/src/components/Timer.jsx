import { useState, useEffect, useRef, useCallback } from 'react'
import InputField from './inputField'
import Alarm from '../assets/audio/Alarm.mp3'
import {
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Volume2,
  VolumeX,
  Check,
  X,
  BellRing,
  Music
} from 'lucide-react'

function Timer({ isActive, setIsActive, isAlarm, setIsAlarm }) {
  const [isEditing, setIsEditing] = useState(false)

  // Stored configured time in editing mode
  const [hours, setHours] = useState(0)
  const [minutes, setMinutes] = useState(25)
  const [seconds, setSeconds] = useState(0)

  // Countdown state in seconds
  const [totalSeconds, setTotalSeconds] = useState(25 * 60)
  const [initialSeconds, setInitialSeconds] = useState(25 * 60)
  const [isMuted, setIsMuted] = useState(false)
  const [alarmAudio, setAlarmAudio] = useState(null)
  const [isChoosingAudio, setIsChoosingAudio] = useState(false)
  const [audioError, setAudioError] = useState('')

  const audioRef = useRef(null)
  const previewAudioRef = useRef(null)
  const previewTimeoutRef = useRef(null)
  const beepIntervalRef = useRef(null)

  // Helper to play a short test/preview tone
  const playTone = (freq = 880, duration = 0.2) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      if (ctx.state === 'suspended') {
        ctx.resume()
      }
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime)
      gain.gain.setValueAtTime(0.25, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + duration)
    } catch {
      // Ignore if audio context unavailable
    }
  }

  const stopPreviewSound = useCallback(() => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current)
      previewTimeoutRef.current = null
    }

    if (previewAudioRef.current) {
      previewAudioRef.current.pause()
      previewAudioRef.current.src = ''
      previewAudioRef.current = null
    }
  }, [])

  const initializeAlarmAudio = useCallback((audioUrl) => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = audioUrl
      audioRef.current.load()
      return
    }

    const audio = new Audio(audioUrl)
    audio.loop = true
    audio.preload = 'auto'
    audioRef.current = audio
  }, [])

  const previewAlarmSound = useCallback(
    (audioUrl) => {
      stopPreviewSound()

      const preview = new Audio(audioUrl)
      preview.loop = false
      preview.volume = 0.7
      previewAudioRef.current = preview

      preview
        .play()
        .then(() => {
          previewTimeoutRef.current = setTimeout(stopPreviewSound, 2500)
        })
        .catch((error) => {
          console.warn('Alarm audio preview failed:', error)
          stopPreviewSound()
        })
    },
    [stopPreviewSound]
  )

  // Synthesized fallback alarm (beeps repeatedly if MP3 fails)
  const startSynthesizedAlarm = useCallback(() => {
    playTone(900, 0.25)
    clearInterval(beepIntervalRef.current)
    beepIntervalRef.current = setInterval(() => {
      playTone(900, 0.25)
      setTimeout(() => playTone(1200, 0.25), 180)
    }, 900)
  }, [])

  const stopSynthesizedAlarm = useCallback(() => {
    if (beepIntervalRef.current) {
      clearInterval(beepIntervalRef.current)
      beepIntervalRef.current = null
    }
  }, [])

  const startAlarmSound = useCallback(() => {
    if (isMuted) return

    let mp3Playing = false
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      const playPromise = audioRef.current.play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            mp3Playing = true
          })
          .catch((err) => {
            console.warn('MP3 playback failed, switching to synthesized alarm:', err)
            startSynthesizedAlarm()
          })
      }
    } else {
      startSynthesizedAlarm()
    }

    // Safety fallback: if audioRef doesn't play within 500ms, start synth alarm
    setTimeout(() => {
      if (!mp3Playing && audioRef.current?.paused) {
        startSynthesizedAlarm()
      }
    }, 500)
  }, [isMuted, startSynthesizedAlarm])

  const stopAlarmSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    stopPreviewSound()
    stopSynthesizedAlarm()
  }, [stopPreviewSound, stopSynthesizedAlarm])

  // Load the saved alarm sound, falling back to the default alarm.
  useEffect(() => {
    let isCurrent = true

    const loadSavedAudio = async () => {
      try {
        const savedAudio = await window.api?.getAlarmAudio?.()
        if (!isCurrent) return

        if (savedAudio?.audioUrl) {
          setAlarmAudio(savedAudio)
          initializeAlarmAudio(savedAudio.audioUrl)
        } else {
          initializeAlarmAudio(Alarm)
        }
      } catch (error) {
        console.warn('Could not load the saved alarm audio:', error)
        if (isCurrent) {
          setAudioError('Using the default alarm sound.')
          initializeAlarmAudio(Alarm)
        }
      }
    }

    loadSavedAudio()

    return () => {
      isCurrent = false
      stopAlarmSound()
      stopPreviewSound()
    }
  }, [initializeAlarmAudio, stopAlarmSound, stopPreviewSound])

  // Countdown interval
  useEffect(() => {
    if (!isActive) return

    const interval = setInterval(() => {
      setTotalSeconds((prev) => {
        if (prev <= 1) {
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive])

  // Trigger alarm when timer hits 0
  useEffect(() => {
    if (isActive && totalSeconds === 0) {
      setIsActive(false)
      setIsAlarm(true)
      startAlarmSound()
    }
  }, [isActive, totalSeconds, setIsActive, setIsAlarm, startAlarmSound])

  // Helpers to format seconds into HH:MM:SS
  const curHours = Math.floor(totalSeconds / 3600)
  const curMinutes = Math.floor((totalSeconds % 3600) / 60)
  const curSeconds = totalSeconds % 60

  // Remaining time for the bottom track and the countdown ring
  const progressPercent = initialSeconds > 0 ? (totalSeconds / initialSeconds) * 100 : 0

  const handleStart = () => {
    // Prime the audio on user gesture
    if (audioRef.current) {
      audioRef.current.load()
    }

    if (totalSeconds === 0) {
      const configuredTotal = hours * 3600 + minutes * 60 + seconds
      if (configuredTotal === 0) {
        setIsEditing(true)
        return
      }
      setTotalSeconds(configuredTotal)
      setInitialSeconds(configuredTotal)
    }
    stopAlarmSound()
    setIsAlarm(false)
    setIsActive(true)
  }

  const handlePause = () => {
    setIsActive(false)
  }

  const handleReset = () => {
    setIsActive(false)
    setIsAlarm(false)
    stopAlarmSound()
    setTotalSeconds(initialSeconds)
  }

  const handleOpenEdit = () => {
    setIsActive(false)
    setIsAlarm(false)
    stopAlarmSound()
    setHours(Math.floor(totalSeconds / 3600))
    setMinutes(Math.floor((totalSeconds % 3600) / 60))
    setSeconds(totalSeconds % 60)
    setIsEditing(true)
  }

  const handleSaveEdit = (startImmediately = false) => {
    const total = hours * 3600 + minutes * 60 + seconds
    if (total > 0) {
      setTotalSeconds(total)
      setInitialSeconds(total)
      setIsEditing(false)
      setIsAlarm(false)
      stopAlarmSound()
      if (startImmediately) {
        setIsActive(true)
      }
    }
  }

  const handleApplyPreset = (m, h = 0, s = 0) => {
    if (audioRef.current) {
      audioRef.current.load()
    }
    setHours(h)
    setMinutes(m)
    setSeconds(s)
    const total = h * 3600 + m * 60 + s
    setTotalSeconds(total)
    setInitialSeconds(total)
    setIsEditing(false)
    setIsAlarm(false)
    stopAlarmSound()
    setIsActive(true)
  }

  const handleDismissAlarm = () => {
    setIsAlarm(false)
    stopAlarmSound()
    setTotalSeconds(initialSeconds)
  }

  const handleToggleMute = () => {
    const nextMuted = !isMuted
    setIsMuted(nextMuted)
    if (nextMuted) {
      stopAlarmSound()
    } else {
      // Play a friendly confirmation chirp
      playTone(1050, 0.15)
    }
  }

  const handleChooseAlarmAudio = async () => {
    if (isChoosingAudio) return

    setIsChoosingAudio(true)
    setAudioError('')

    try {
      const result = await window.api?.chooseAlarmAudio?.()
      if (result?.canceled) return

      if (result?.error) {
        setAudioError(result.error)
        return
      }

      if (!result?.audioUrl) return

      const nextAudio = {
        fileName: result.fileName || 'Custom alarm sound',
        audioUrl: result.audioUrl
      }

      setAlarmAudio(nextAudio)
      initializeAlarmAudio(nextAudio.audioUrl)
      stopAlarmSound()
      previewAlarmSound(nextAudio.audioUrl)
    } catch (error) {
      console.warn('Could not choose alarm audio:', error)
      setAudioError('Could not choose an alarm sound.')
    } finally {
      setIsChoosingAudio(false)
    }
  }

  const handleResetAlarmAudio = async () => {
    setAudioError('')

    try {
      await window.api?.resetAlarmAudio?.()
      setAlarmAudio(null)
      initializeAlarmAudio(Alarm)
      previewAlarmSound(Alarm)
    } catch (error) {
      console.warn('Could not reset alarm audio:', error)
      setAudioError('Could not reset the alarm sound.')
    }
  }

  // ===== Circular Progress Ring SVG =====
  const radius = 46
  const circumference = 2 * Math.PI * radius
  const remainingOffset = circumference - (progressPercent / 100) * circumference

  const renderProgressRing = () => (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 120 120"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r={radius} fill="none" stroke="#FFFFFF" strokeOpacity="0.2" strokeWidth="2.5" />
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke="#FF4D00"
        strokeWidth="2.5"
        strokeDasharray={circumference}
        strokeDashoffset={remainingOffset}
        strokeLinecap="square"
        transform="rotate(-90 60 60)"
        className="progress-ring__circle"
      />
    </svg>
  )

  // ===== Sound Wave Animation (when alarm is active) =====
  const renderSoundWave = () => (
    <div className="sound-wave">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="sound-wave__bar" style={{ animationDelay: `${i * 100}ms` }} />
      ))}
    </div>
  )

  return (
    <div className="relative flex-1 min-h-0 flex flex-col justify-between border-x-2 border-black bg-[#111111] px-3 py-1 pb-2.5 overflow-hidden">
      {isAlarm ? (
        // ===== ALARM ACTIVE STATE =====
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-1 overflow-hidden">
          <div className="relative flex items-center justify-center">
            <BellRing className="w-8 h-8 text-[#FF4D00] animate-bounce" />
            <span className="absolute -inset-2 border-2 border-[#FF4D00] animate-ping" />
          </div>

          <h2 className="border-x-4 border-[#FF4D00] px-3 text-2xl font-black text-white tracking-[0.2em] uppercase">
            Time's Up!
          </h2>

          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
            Session complete
          </p>

          {renderSoundWave()}

          <button
            onClick={handleDismissAlarm}
            className="mt-0.5 shrink-0 border-2 border-black px-6 py-2 bg-[#FF4D00] text-black font-black text-sm uppercase tracking-widest shadow-[5px_5px_0_#FFFFFF] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#FFFFFF] focus-visible:bg-white active:translate-x-0 active:translate-y-0 active:shadow-[3px_3px_0_#FFFFFF] cursor-pointer"
          >
            Dismiss Alarm
          </button>
        </div>
      ) : isEditing ? (
        // ===== EDIT / SETUP MODE =====
        <div className="flex-1 min-h-0 flex flex-col justify-center gap-2 overflow-hidden pt-0 pb-8">
          {/* Time Inputs */}
          <div className="flex items-start justify-center gap-1 shrink-0">
            <InputField label="hr" value={hours} onChange={setHours} max={99} />
            <span className="flex h-12 items-center text-sm font-black leading-none text-[#FF4D00]" aria-hidden="true">
              :
            </span>
            <InputField label="min" value={minutes} onChange={setMinutes} max={59} />
            <span className="flex h-12 items-center text-sm font-black leading-none text-[#FF4D00]" aria-hidden="true">
              :
            </span>
            <InputField label="sec" value={seconds} onChange={setSeconds} max={59} />
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center justify-center gap-1 shrink-0">
            {[
              { label: '5m', min: 5 },
              { label: '15m', min: 15 },
              { label: '25m', min: 25 },
              { label: '45m', min: 45 },
              { label: '1h', min: 0, hr: 1 }
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleApplyPreset(preset.min, preset.hr || 0)}
                className="border-2 border-black px-2 py-0.5 bg-white text-black font-mono text-[9px] font-bold uppercase shadow-[2px_2px_0_#FF4D00] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#FF4D00] hover:shadow-[3px_3px_0_#FFFFFF] focus-visible:bg-[#FF4D00] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_#FFFFFF] cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Sound Controls - Compact */}
          <div className="flex flex-col items-center gap-0.5 min-h-0 shrink-0">
            <div className="flex items-center justify-center gap-1">
              <button
                onClick={handleChooseAlarmAudio}
                disabled={isChoosingAudio}
                className="flex items-center gap-1 border-2 border-black px-2 py-0.5 bg-white text-black font-mono text-[9px] font-bold uppercase shadow-[2px_2px_0_#FFFFFF] transition-all hover:bg-[#FF4D00] hover:shadow-[2px_2px_0_#000000] focus-visible:bg-[#FF4D00] active:shadow-[1px_1px_0_#000000] cursor-pointer disabled:opacity-50"
              >
                {isChoosingAudio ? (
                  <span className="h-2.5 w-2.5 border-2 border-black border-r-[#FF4D00] animate-spin" />
                ) : (
                  <Music className="w-3 h-3" />
                )}
                <span className="truncate max-w-[120px]">
                  {alarmAudio ? alarmAudio.fileName : 'Choose sound'}
                </span>
              </button>

              {alarmAudio && (
                <button
                  onClick={handleResetAlarmAudio}
                  aria-label="Reset to default alarm sound"
                  className="flex items-center justify-center w-6 h-6 border-2 border-black bg-white text-black shadow-[1px_1px_0_#FF4D00] transition-all hover:bg-[#FF4D00] hover:shadow-[2px_2px_0_#FFFFFF] focus-visible:bg-[#FF4D00] active:shadow-[1px_1px_0_#FFFFFF] cursor-pointer"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                </button>
              )}
            </div>

            {audioError && (
              <p className="px-1 text-center font-mono text-[8px] font-bold text-[#FF4D00] uppercase">
                {audioError}
              </p>
            )}

            {!audioError && (
              <p className="font-mono text-[8px] font-bold text-zinc-500 uppercase tracking-wider">
                {alarmAudio ? `Sound: ${alarmAudio.fileName}` : 'Default alarm sound'}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-2 shrink-0">
            <button
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-1 border-2 border-black px-3 py-0.5 bg-black text-white font-mono text-[9px] font-bold uppercase shadow-[2px_2px_0_#FF4D00] transition-all hover:bg-zinc-900 hover:text-[#FF4D00] hover:shadow-[3px_3px_0_#FFFFFF] focus-visible:text-[#FF4D00] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#FFFFFF] cursor-pointer"
            >
              <X className="w-3 h-3" />
              Cancel
            </button>

            <button
              onClick={() => handleSaveEdit(true)}
              className="flex items-center gap-1.5 border-2 border-black px-4 py-0.5 bg-[#FF4D00] text-black font-mono text-[9px] font-black uppercase shadow-[2px_2px_0_#FFFFFF] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-white hover:shadow-[3px_3px_0_#FF4D00] focus-visible:bg-white active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_#FFFFFF] cursor-pointer"
            >
              <Check className="w-3 h-3" />
              Start
            </button>
          </div>
        </div>
      ) : (
        // ===== COUNTDOWN VIEW =====
        <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
          {/* Timer Display with Circular Progress Ring */}
          <div className="relative flex-1 min-h-0 flex items-center justify-center border-2 border-white/20 bg-black px-2 py-1 overflow-hidden">
            <div className="relative aspect-square h-[94%] max-h-full">
              {renderProgressRing()}

              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6">
                <div
                  className={`font-mono text-[1.7rem] font-black leading-none tracking-tight tabular-nums transition-all duration-300 ${
                    isActive ? 'text-[#FF4D00]' : totalSeconds === 0 ? 'text-zinc-600' : 'text-white'
                  }`}
                >
                  {`${curHours.toString().padStart(2, '0')}:${curMinutes
                    .toString()
                    .padStart(2, '0')}:${curSeconds.toString().padStart(2, '0')}`}
                </div>

                {/* Status Label */}
                <span
                  className={`mt-1 font-mono text-[10px] font-black uppercase tracking-[0.25em] transition-colors ${
                    audioError
                      ? 'text-[#FF4D00]'
                      : isActive
                        ? 'text-[#FF4D00]'
                        : totalSeconds === 0
                          ? 'text-zinc-600'
                          : 'text-white'
                  }`}
                >
                  {audioError || (isActive ? 'Focusing' : totalSeconds === 0 ? 'Ready' : 'Paused')}
                </span>
              </div>
            </div>
          </div>

          {/* Control Dock */}
          <div className="mt-1 mb-1 grid w-full shrink-0 grid-cols-5 items-center justify-items-center px-2">
            {/* Edit */}
            <button
              onClick={handleOpenEdit}
              aria-label="Edit duration"
              className="flex h-8 w-8 items-center justify-center border-2 border-black bg-white text-black shadow-[3px_3px_0_#FFFFFF] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#FF4D00] hover:shadow-[4px_4px_0_#FF4D00] focus-visible:bg-[#FF4D00] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_#FFFFFF] cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>

            {/* Sound */}
            <button
              onClick={handleChooseAlarmAudio}
              aria-label={
                alarmAudio ? `Change alarm sound: ${alarmAudio.fileName}` : 'Change alarm sound'
              }
              title={alarmAudio ? `Alarm sound: ${alarmAudio.fileName}` : 'Change alarm sound'}
              disabled={isChoosingAudio}
              className={`flex h-8 w-8 items-center justify-center border-2 border-black bg-white text-black shadow-[3px_3px_0_#FFFFFF] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#FF4D00] hover:shadow-[4px_4px_0_#FF4D00] focus-visible:bg-[#FF4D00] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_#FFFFFF] cursor-pointer disabled:opacity-50 ${
                alarmAudio ? 'text-[#FF4D00]' : 'text-black'
              }`}
            >
              {isChoosingAudio ? (
                <span className="h-3.5 w-3.5 rounded-none border-2 border-black border-r-[#FF4D00] animate-spin" />
              ) : (
                <Music className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Play / Pause Primary CTA */}
            {isActive ? (
              <button
                onClick={handlePause}
                aria-label="Pause"
                className="flex h-11 w-11 items-center justify-center border-2 border-black bg-[#FF4D00] text-black shadow-[4px_4px_0_#FFFFFF] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-white hover:shadow-[5px_5px_0_#FF4D00] focus-visible:bg-white active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_#FFFFFF] cursor-pointer"
              >
                <Pause className="w-5 h-5 fill-current" />
              </button>
            ) : (
              <button
                onClick={handleStart}
                aria-label="Start"
                className="flex h-11 w-11 items-center justify-center border-2 border-black bg-[#FF4D00] text-black shadow-[4px_4px_0_#FFFFFF] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-white hover:shadow-[5px_5px_0_#FF4D00] focus-visible:bg-white active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_#FFFFFF] cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
              </button>
            )}

            {/* Reset */}
            <button
              onClick={handleReset}
              aria-label="Reset timer"
              className="flex h-8 w-8 items-center justify-center border-2 border-black bg-white text-black shadow-[3px_3px_0_#FFFFFF] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#FF4D00] hover:shadow-[4px_4px_0_#FF4D00] focus-visible:bg-[#FF4D00] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_#FFFFFF] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Mute */}
            <button
              onClick={handleToggleMute}
              aria-label={isMuted ? 'Unmute alarm' : 'Mute alarm'}
              className={`flex h-8 w-8 items-center justify-center border-2 border-black bg-white text-black shadow-[3px_3px_0_#FFFFFF] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#FF4D00] hover:shadow-[4px_4px_0_#FF4D00] focus-visible:bg-[#FF4D00] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_#FFFFFF] cursor-pointer ${
                isMuted ? 'opacity-50' : ''
              }`}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      {/* Progress Track at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-2 border-t-2 border-black bg-white/15 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isAlarm ? 'bg-[#FF4D00] animate-pulse' : isActive ? 'bg-[#FF4D00]' : 'bg-zinc-600'
          }`}
          style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
        />
      </div>
    </div>
  )
}

export default Timer
