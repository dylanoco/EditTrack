import { useState, useRef, useEffect } from 'react'

export function Tooltip({ children, content, position = 'top', className = '' }) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const triggerRef = useRef(null)
  const tooltipRef = useRef(null)
  const timerRef = useRef(null)

  function show() {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setVisible(true), 200)
  }

  function hide() {
    clearTimeout(timerRef.current)
    setVisible(false)
  }

  useEffect(() => {
    if (!visible || !triggerRef.current || !tooltipRef.current) return
    const trigger = triggerRef.current.getBoundingClientRect()
    const tip = tooltipRef.current.getBoundingClientRect()
    const gap = 8

    let top = 0
    let left = 0

    switch (position) {
      case 'bottom':
        top = trigger.bottom + gap
        left = trigger.left + trigger.width / 2 - tip.width / 2
        break
      case 'left':
        top = trigger.top + trigger.height / 2 - tip.height / 2
        left = trigger.left - tip.width - gap
        break
      case 'right':
        top = trigger.top + trigger.height / 2 - tip.height / 2
        left = trigger.right + gap
        break
      default:
        top = trigger.top - tip.height - gap
        left = trigger.left + trigger.width / 2 - tip.width / 2
    }

    left = Math.max(8, Math.min(left, window.innerWidth - tip.width - 8))
    top = Math.max(8, Math.min(top, window.innerHeight - tip.height - 8))

    setCoords({ top, left })
  }, [visible, position])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  if (!content) return children

  return (
    <span
      ref={triggerRef}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      className={`inline-flex ${className}`}
    >
      {children}
      {visible && (
        <span
          ref={tooltipRef}
          role="tooltip"
          style={{ top: coords.top, left: coords.left }}
          className="fixed z-9999 max-w-xs rounded-lg bg-slate-900 px-3 py-2 text-xs leading-relaxed text-slate-100 shadow-lg dark:bg-slate-700 dark:text-white pointer-events-none"
        >
          {content}
        </span>
      )}
    </span>
  )
}

export function InfoTip({ content, position = 'top' }) {
  return (
    <Tooltip content={content} position={position}>
      <span className="ml-1 inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-400">
        ?
      </span>
    </Tooltip>
  )
}
