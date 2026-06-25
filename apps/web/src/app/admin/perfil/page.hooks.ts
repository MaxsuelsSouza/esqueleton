'use client'

// Hook que concentra toda a lógica de estado e efeitos da página de perfil da loja
import { useState, useEffect, useCallback } from 'react'
import { storeProfileService } from '@/modules/store-profile/services/store-profile.service'
import type { StoreProfile, WhatsAppCatalogStatus } from '@esqueleton/shared'
import { buildDiff } from '@/shared/utils/diff'

type FormData = {
  storeName: string
  address: string
  whatsapp: string
  instagram: string
  logoUrl: string
  themeColor: string
  announcements: string[]
  // Integração WhatsApp Business
  metaAccessToken: string
  metaWabaId: string
  metaCatalogId: string
  whatsappCatalogEnabled: boolean
}

// Valores exibidos enquanto o perfil ainda não carregou da API
const DEFAULT_PROFILE: StoreProfile = {
  id: '',
  storeName: 'Minha Loja',
  themeColor: '#000000',
  announcements: [],
  whatsappCatalogEnabled: false,
  updatedAt: '',
}

export function usePerfilPage() {
  // O perfil é buscado direto da API com o token do admin —
  // a área admin não usa mais o contexto público da loja
  const [profile, setProfile] = useState<StoreProfile>(DEFAULT_PROFILE)
  const [form, setForm] = useState<FormData>({
    storeName: '',
    address: '',
    whatsapp: '',
    instagram: '',
    logoUrl: '',
    themeColor: '#000000',
    announcements: [],
    metaAccessToken: '',
    metaWabaId: '',
    metaCatalogId: '',
    whatsappCatalogEnabled: false,
  })
  const [newAnnouncement, setNewAnnouncement] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Carrega o perfil da loja do administrador (rota protegida — exige token)
  useEffect(() => {
    storeProfileService
      .getProfile(localStorage.getItem('admin_token') ?? '')
      .then(setProfile)
      .catch(() => {
        // Se a API não estiver disponível, mantém os valores padrão silenciosamente
      })
  }, [])

  // ── Estado da integração WhatsApp ──
  const [guideStep, setGuideStep] = useState(1)
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppCatalogStatus | null>(null)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ synced: number; failed: number; skipped: number; total: number } | null>(null)

  // Preenche o formulário quando o perfil carregar
  useEffect(() => {
    setForm({
      storeName: profile.storeName,
      address: profile.address ?? '',
      whatsapp: profile.whatsapp ?? '',
      instagram: profile.instagram ?? '',
      logoUrl: profile.logoUrl ?? '',
      themeColor: profile.themeColor,
      announcements: profile.announcements ?? [],
      metaAccessToken: profile.metaAccessToken ?? '',
      metaWabaId: profile.metaWabaId ?? '',
      metaCatalogId: profile.metaCatalogId ?? '',
      whatsappCatalogEnabled: profile.whatsappCatalogEnabled ?? false,
    })
  }, [profile])

  // Carrega o status do WhatsApp quando o perfil tem integração configurada
  const loadWhatsAppStatus = useCallback(async () => {
    const token = localStorage.getItem('admin_token') ?? ''
    try {
      const status = await storeProfileService.getWhatsAppStatus(token)
      setWhatsappStatus(status)
    } catch {
      // Silencioso — status fica null
    }
  }, [])

  useEffect(() => {
    if (profile.metaCatalogId && profile.metaAccessToken && profile.whatsappCatalogEnabled) {
      loadWhatsAppStatus()
    }
  }, [profile.metaCatalogId, profile.metaAccessToken, profile.whatsappCatalogEnabled, loadWhatsAppStatus])

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    // Aplica a cor do tema imediatamente para o usuário ver o resultado em tempo real
    if (key === 'themeColor') {
      document.documentElement.style.setProperty('--color-primary', value as string)
    }
  }

  function addAnnouncement() {
    const text = newAnnouncement.trim()
    if (!text) return
    set('announcements', [...form.announcements, text])
    setNewAnnouncement('')
  }

  function removeAnnouncement(index: number) {
    set('announcements', form.announcements.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (!form.storeName.trim()) {
      setSaveError('O nome da loja é obrigatório.')
      return
    }

    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    const token = localStorage.getItem('admin_token') ?? ''
    try {
      const payload = {
        storeName: form.storeName.trim(),
        address: form.address.trim() || undefined,
        whatsapp: form.whatsapp.trim() || undefined,
        instagram: form.instagram.replace('@', '').trim() || undefined,
        logoUrl: form.logoUrl.trim() || undefined,
        themeColor: form.themeColor,
        announcements: form.announcements,
        metaAccessToken: form.metaAccessToken.trim() || undefined,
        metaWabaId: form.metaWabaId.trim() || undefined,
        metaCatalogId: form.metaCatalogId.trim() || undefined,
        whatsappCatalogEnabled: form.whatsappCatalogEnabled,
      }
      const diff = buildDiff(profile as unknown as Record<string, unknown>, payload)
      if (Object.keys(diff).length === 0) { setIsSaving(false); return }
      const updated = await storeProfileService.updateProfile(diff, token)
      // Atualiza o estado local para refletir os dados salvos imediatamente
      setProfile(updated)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      setSaveError('Erro ao salvar. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleTestWhatsApp() {
    setIsTesting(true)
    setTestResult(null)
    const token = localStorage.getItem('admin_token') ?? ''
    try {
      const result = await storeProfileService.testWhatsAppConnection(token)
      setTestResult(result)
      if (result.ok) {
        loadWhatsAppStatus()
      }
    } catch {
      setTestResult({ ok: false, error: 'Erro ao testar conexão. Tente novamente.' })
    } finally {
      setIsTesting(false)
    }
  }

  async function handleSyncWhatsApp() {
    setIsSyncing(true)
    setSyncResult(null)
    const token = localStorage.getItem('admin_token') ?? ''
    try {
      const result = await storeProfileService.syncWhatsAppCatalog(token)
      setSyncResult(result)
      loadWhatsAppStatus()
    } catch {
      setSyncResult({ synced: 0, failed: 0, skipped: 0, total: 0 })
    } finally {
      setIsSyncing(false)
    }
  }

  return {
    form,
    set,
    newAnnouncement,
    setNewAnnouncement,
    addAnnouncement,
    removeAnnouncement,
    isSaving,
    saveError,
    saveSuccess,
    handleSave,
    // WhatsApp
    guideStep,
    setGuideStep,
    whatsappStatus,
    isTesting,
    testResult,
    handleTestWhatsApp,
    isSyncing,
    syncResult,
    handleSyncWhatsApp,
  }
}
