'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  MessageCircle,
  Image,
  Package,
  Eye,
  Share2,
  Check,
  X,
  ExternalLink,
  Copy,
} from 'lucide-react'

type OnboardingStatus = {
  whatsapp: boolean
  logo: boolean
  hasProducts: boolean
}

type OnboardingChecklistProps = {
  status: OnboardingStatus
  storeSlug: string
  onDismiss: () => void
}

type Step = {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  done: boolean
  action: React.ReactNode
}

const ICON_CLASS = 'w-5 h-5'

export function OnboardingChecklist({ status, storeSlug, onDismiss }: OnboardingChecklistProps) {
  const [visitedStore, setVisitedStore] = useState(false)
  const [sharedLink, setSharedLink] = useState(false)
  const [copied, setCopied] = useState(false)

  // Lê marcadores locais ao montar
  useEffect(() => {
    setVisitedStore(localStorage.getItem('onboarding_visited_store') === 'true')
    setSharedLink(localStorage.getItem('onboarding_shared_link') === 'true')
  }, [])

  const storeUrl = `${window.location.origin}/loja/${storeSlug}`

  const markVisited = useCallback(() => {
    localStorage.setItem('onboarding_visited_store', 'true')
    setVisitedStore(true)
  }, [])

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(storeUrl)
      localStorage.setItem('onboarding_shared_link', 'true')
      setSharedLink(true)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback para navegadores sem clipboard API
      const input = document.createElement('input')
      input.value = storeUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      localStorage.setItem('onboarding_shared_link', 'true')
      setSharedLink(true)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [storeUrl])

  const handleShareWhatsApp = useCallback(() => {
    const text = encodeURIComponent(`Confira minha loja: ${storeUrl}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
    localStorage.setItem('onboarding_shared_link', 'true')
    setSharedLink(true)
  }, [storeUrl])

  const steps: Step[] = [
    {
      id: 'whatsapp',
      label: 'Configure o WhatsApp da loja',
      description: 'Seus clientes enviam pedidos por ele',
      icon: <MessageCircle className={ICON_CLASS} />,
      done: status.whatsapp,
      action: (
        <Link href="/admin/perfil" className="text-sm font-medium text-blue-600 hover:text-blue-800">
          Configurar →
        </Link>
      ),
    },
    {
      id: 'logo',
      label: 'Adicione o logo da loja',
      description: 'Deixe sua loja com a sua cara',
      icon: <Image className={ICON_CLASS} />,
      done: status.logo,
      action: (
        <Link href="/admin/perfil" className="text-sm font-medium text-blue-600 hover:text-blue-800">
          Adicionar →
        </Link>
      ),
    },
    {
      id: 'product',
      label: 'Cadastre seu primeiro produto',
      description: 'Seus clientes precisam ver o que você vende',
      icon: <Package className={ICON_CLASS} />,
      done: status.hasProducts,
      action: (
        <Link href="/admin/produtos" className="text-sm font-medium text-blue-600 hover:text-blue-800">
          Cadastrar →
        </Link>
      ),
    },
    {
      id: 'visit',
      label: 'Veja como seus clientes verão sua loja',
      description: 'Confira o resultado antes de divulgar',
      icon: <Eye className={ICON_CLASS} />,
      done: visitedStore,
      action: (
        <a
          href={`/loja/${storeSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={markVisited}
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          Ver loja <ExternalLink className="w-3.5 h-3.5" />
        </a>
      ),
    },
    {
      id: 'share',
      label: 'Compartilhe o link da sua loja',
      description: 'Divulgue no WhatsApp e redes sociais',
      icon: <Share2 className={ICON_CLASS} />,
      done: sharedLink,
      action: (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            <Copy className="w-3.5 h-3.5" />
            {copied ? 'Copiado!' : 'Copiar link'}
          </button>
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="inline-flex items-center gap-1 text-sm font-medium text-green-600 hover:text-green-800"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </button>
        </div>
      ),
    },
  ]

  const completedCount = steps.filter((s) => s.done).length
  const allDone = completedCount === steps.length
  const progressPercent = (completedCount / steps.length) * 100

  // Esconde automaticamente quando tudo está completo
  if (allDone) return null

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5 mb-6">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Configure sua loja
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Complete os passos abaixo para começar a vender
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 p-1 -mt-1 -mr-1"
          title="Já sei o que fazer, fechar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Barra de progresso */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-gray-700">
            {completedCount} de {steps.length} completos
          </span>
          <span className="text-sm text-gray-500">{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Lista de passos */}
      <div className="space-y-3">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
              step.done
                ? 'border-green-200 bg-green-50/50'
                : 'border-gray-200 bg-white'
            }`}
          >
            {/* Ícone de check ou ícone do passo */}
            <div
              className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full ${
                step.done
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {step.done ? <Check className="w-4 h-4" /> : step.icon}
            </div>

            {/* Texto */}
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium ${
                  step.done ? 'text-green-700 line-through' : 'text-gray-900'
                }`}
              >
                {step.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
            </div>

            {/* Ação */}
            <div className="flex-shrink-0">
              {step.done ? (
                <span className="text-xs font-medium text-green-600">Feito</span>
              ) : (
                step.action
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
