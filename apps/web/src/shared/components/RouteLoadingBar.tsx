'use client'

// Barra de carregamento global — aparece no topo da tela durante mudanças de rota
// Intercepta cliques em links e navegações programáticas (router.push)
import { useEffect, useState, useCallback, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function RouteLoadingBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Avança a barra gradualmente enquanto carrega (nunca chega a 100% sozinha)
  const startLoading = useCallback(() => {
    setLoading(true)
    setProgress(20)

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev
        // Avança cada vez mais devagar conforme se aproxima de 90%
        return prev + (90 - prev) * 0.1
      })
    }, 300)
  }, [])

  const stopLoading = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Completa a barra rapidamente antes de sumir
    setProgress(100)
    timeoutRef.current = setTimeout(() => {
      setLoading(false)
      setProgress(0)
    }, 300)
  }, [])

  // Para o loading quando a rota muda (pathname ou searchParams)
  useEffect(() => {
    stopLoading()
  }, [pathname, searchParams, stopLoading])

  // Intercepta cliques em links <a> para iniciar o loading antes da navegação
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest('a')
      if (!anchor) return

      const href = anchor.getAttribute('href')
      if (!href) return

      // Ignora links externos, âncoras, downloads e target _blank
      if (
        href.startsWith('http') ||
        href.startsWith('#') ||
        anchor.hasAttribute('download') ||
        anchor.target === '_blank'
      ) return

      // Ignora se a navegação é para a mesma rota
      const currentUrl = pathname + (searchParams?.toString() ? `?${searchParams}` : '')
      if (href === currentUrl || href === pathname) return

      startLoading()
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [pathname, searchParams, startLoading])

  // Intercepta navegações programáticas (router.push/replace) via pushState/replaceState
  useEffect(() => {
    const originalPushState = history.pushState.bind(history)
    const originalReplaceState = history.replaceState.bind(history)

    history.pushState = function (...args) {
      startLoading()
      return originalPushState(...args)
    }

    history.replaceState = function (...args) {
      // Só inicia loading se a URL realmente mudou
      const newUrl = args[2]
      if (newUrl && newUrl !== window.location.pathname + window.location.search) {
        startLoading()
      }
      return originalReplaceState(...args)
    }

    return () => {
      history.pushState = originalPushState
      history.replaceState = originalReplaceState
    }
  }, [startLoading])

  // Limpa os timers ao desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  if (!loading) return null

  return (
    <div className="fixed inset-x-0 top-0 z-[9999] h-[3px]">
      <div
        className="h-full rounded-r-full bg-gradient-to-r from-blue-500 to-blue-600 shadow-sm shadow-blue-500/30 transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
