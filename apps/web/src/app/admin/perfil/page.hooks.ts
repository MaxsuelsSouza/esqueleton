'use client'

// Hook que concentra toda a lógica de estado e efeitos da página de perfil da loja
import { useState, useEffect } from 'react'
import { storeProfileService } from '@/modules/store-profile/services/store-profile.service'
import type { StoreProfile } from '@esqueleton/shared'
import { buildDiff } from '@/shared/utils/diff'

type FormData = {
  storeName: string
  address: string
  whatsapp: string
  instagram: string
  logoUrl: string
  themeColor: string
  announcements: string[]
}

// Valores exibidos enquanto o perfil ainda não carregou da API
const DEFAULT_PROFILE: StoreProfile = {
  id: '',
  storeName: 'Minha Loja',
  themeColor: '#000000',
  announcements: [],
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
    })
    // Restaura a cor salva como cor efetiva do tema — evita que uma prévia
    // descartada (sem salvar) continue aplicada após recarregar/sair da página
    document.documentElement.style.setProperty('--color-primary', profile.themeColor)
  }, [profile])

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
  }
}
