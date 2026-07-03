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
  const [syncError, setSyncError] = useState<string | null>(null)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  // Preenche o formulário quando o perfil carregar.
  // O token da Meta nunca volta da API (write-only) — o campo começa vazio
  // e `hasMetaAccessToken` indica que já existe um token salvo.
  useEffect(() => {
    setForm({
      storeName: profile.storeName,
      address: profile.address ?? '',
      whatsapp: profile.whatsapp ?? '',
      instagram: profile.instagram ?? '',
      logoUrl: profile.logoUrl ?? '',
      themeColor: profile.themeColor,
      announcements: profile.announcements ?? [],
      metaAccessToken: '',
      metaWabaId: profile.metaWabaId ?? '',
      metaCatalogId: profile.metaCatalogId ?? '',
      whatsappCatalogEnabled: profile.whatsappCatalogEnabled ?? false,
    })
    // Restaura a cor salva como cor efetiva do tema — evita que uma prévia
    // descartada (sem salvar) continue aplicada após recarregar/sair da página
    document.documentElement.style.setProperty('--color-primary', profile.themeColor)
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
    if (profile.metaCatalogId && profile.hasMetaAccessToken && profile.whatsappCatalogEnabled) {
      loadWhatsAppStatus()
    }
  }, [profile.metaCatalogId, profile.hasMetaAccessToken, profile.whatsappCatalogEnabled, loadWhatsAppStatus])

  // A integração está configurada quando há token salvo (ou recém-digitado) + catalog ID
  const hasSavedToken = Boolean(profile.hasMetaAccessToken)
  const whatsappConfigured = Boolean(
    (hasSavedToken || form.metaAccessToken.trim()) && (form.metaCatalogId.trim() || profile.metaCatalogId),
  )

  // Ao desmontar a página, volta a cor efetiva para a salva no perfil —
  // assim uma prévia não salva não "vaza" para o resto do painel
  useEffect(() => {
    return () => {
      document.documentElement.style.setProperty('--color-primary', profile.themeColor)
    }
  }, [profile.themeColor])

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

  // Salva o perfil e retorna true em caso de sucesso — usado também pelo teste
  // de conexão, que precisa garantir que as credenciais digitadas foram salvas
  async function handleSave(): Promise<boolean> {
    if (!form.storeName.trim()) {
      setSaveError('O nome da loja é obrigatório.')
      return false
    }

    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    const token = localStorage.getItem('admin_token') ?? ''
    try {
      // Campos opcionais vazios vão como null — é o que faz a API LIMPAR o valor
      // no banco (undefined seria descartado do JSON e o valor antigo voltaria).
      // whatsapp é obrigatório no schema (não pode ser limpo): só entra quando preenchido.
      const payload = {
        storeName: form.storeName.trim(),
        address: form.address.trim() || null,
        whatsapp: form.whatsapp.trim() || undefined,
        instagram: form.instagram.replace('@', '').trim() || null,
        logoUrl: form.logoUrl.trim() || null,
        themeColor: form.themeColor,
        announcements: form.announcements,
        // Token é write-only: só entra no payload quando o usuário digitou um novo
        metaAccessToken: form.metaAccessToken.trim() || undefined,
        metaWabaId: form.metaWabaId.trim() || undefined,
        metaCatalogId: form.metaCatalogId.trim() || undefined,
        whatsappCatalogEnabled: form.whatsappCatalogEnabled,
      }
      const diff = buildDiff(profile as unknown as Record<string, unknown>, payload)
      if (Object.keys(diff).length === 0) { setIsSaving(false); return true }
      const updated = await storeProfileService.updateProfile(diff, token)
      // Atualiza o estado local para refletir os dados salvos imediatamente
      setProfile(updated)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      return true
    } catch {
      setSaveError('Erro ao salvar. Tente novamente.')
      return false
    } finally {
      setIsSaving(false)
    }
  }

  async function handleTestWhatsApp() {
    setIsTesting(true)
    setTestResult(null)
    const token = localStorage.getItem('admin_token') ?? ''
    try {
      // O teste roda no servidor com as credenciais do banco — salva antes
      // para que o token/ID recém-digitados sejam considerados
      const saved = await handleSave()
      if (!saved) {
        setTestResult({ ok: false, error: 'Não foi possível salvar as credenciais antes do teste.' })
        return
      }
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
    setSyncError(null)
    const token = localStorage.getItem('admin_token') ?? ''
    try {
      const result = await storeProfileService.syncWhatsAppCatalog(token)
      setSyncResult(result)
      loadWhatsAppStatus()
    } catch {
      // Mostra o erro em vez de exibir "0 sincronizados" como se tivesse rodado
      setSyncError('Erro ao sincronizar com o WhatsApp. Tente novamente.')
    } finally {
      setIsSyncing(false)
    }
  }

  // Remove as credenciais da Meta e desativa a sincronização
  async function handleDisconnectWhatsApp() {
    setIsDisconnecting(true)
    const token = localStorage.getItem('admin_token') ?? ''
    try {
      const updated = await storeProfileService.disconnectWhatsAppCatalog(token)
      setProfile(updated)
      setWhatsappStatus(null)
      setTestResult(null)
      setSyncResult(null)
      setSyncError(null)
    } catch {
      setSyncError('Erro ao remover as credenciais. Tente novamente.')
    } finally {
      setIsDisconnecting(false)
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
    syncError,
    handleSyncWhatsApp,
    hasSavedToken,
    whatsappConfigured,
    isDisconnecting,
    handleDisconnectWhatsApp,
  }
}
