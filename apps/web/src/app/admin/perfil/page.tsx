'use client'

// Página de configurações da loja — nome, contato, logo e cor do tema
import { useState, useEffect, useRef } from 'react'
import { ImagePlus, Camera, X, Save, Store, Plus, Megaphone } from 'lucide-react'
import { storeProfileService } from '@/services/store-profile.service'
import { compressImage } from '@/utils/image'
import type { StoreProfile } from '@esqueleton/shared'

// Cores predefinidas para o tema
const THEME_COLORS = [
  { label: 'Preto',     value: '#000000' },
  { label: 'Vermelho',  value: '#e11d48' },
  { label: 'Rosa',      value: '#ec4899' },
  { label: 'Roxo',      value: '#8b5cf6' },
  { label: 'Azul',      value: '#2563eb' },
  { label: 'Verde',     value: '#16a34a' },
  { label: 'Laranja',   value: '#ea580c' },
  { label: 'Marrom',    value: '#92400e' },
]

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

export default function AdminPerfilPage() {
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
  }, [profile])

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    // Aplica a cor do tema imediatamente para o usuário ver o resultado em tempo real
    if (key === 'themeColor') {
      document.documentElement.style.setProperty('--color-primary', value)
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
      const updated = await storeProfileService.updateProfile(
        {
          storeName: form.storeName.trim(),
          address: form.address.trim() || undefined,
          whatsapp: form.whatsapp.trim() || undefined,
          instagram: form.instagram.replace('@', '').trim() || undefined,
          logoUrl: form.logoUrl.trim() || undefined,
          themeColor: form.themeColor,
          announcements: form.announcements,
        },
        token,
      )
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

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">

      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
          <Store size={20} className="text-gray-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Perfil da loja</h1>
          <p className="text-sm text-gray-500">Informações e aparência do catálogo</p>
        </div>
      </div>

      {/* ── Logo ── */}
      <Section title="Logo">
        <LogoUploader
          value={form.logoUrl}
          storeName={form.storeName || 'Minha Loja'}
          onChange={(url) => set('logoUrl', url)}
        />
      </Section>

      {/* ── Informações da loja ── */}
      <Section title="Informações">
        <div className="flex flex-col gap-3">
          <FormField label="Nome da loja">
            <input
              type="text"
              value={form.storeName}
              onChange={(e) => set('storeName', e.target.value)}
              placeholder="Ex: Perfumaria Bella"
              className={inputClass}
            />
          </FormField>

          <FormField label="Endereço" optional>
            <input
              type="text"
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="Ex: Rua das Flores, 123 — São Paulo"
              className={inputClass}
            />
          </FormField>
        </div>
      </Section>

      {/* ── Contato ── */}
      <Section title="Contato">
        <div className="flex flex-col gap-3">
          <FormField label="WhatsApp" optional hint="Número com código do país, sem espaços (ex: 5511999999999)">
            <input
              type="text"
              value={form.whatsapp}
              onChange={(e) => set('whatsapp', e.target.value)}
              placeholder="5511999999999"
              className={inputClass}
            />
          </FormField>

          <FormField label="Instagram" optional hint="Apenas o arroba, sem @">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">@</span>
              <input
                type="text"
                value={form.instagram}
                onChange={(e) => set('instagram', e.target.value.replace('@', ''))}
                placeholder="minhaloja"
                className={`${inputClass} pl-7`}
              />
            </div>
          </FormField>
        </div>
      </Section>

      {/* ── Barra de avisos ── */}
      <Section title="Barra de avisos" hint="Aparece acima do cabeçalho no catálogo público, rotacionando uma mensagem por vez">
        <div className="flex flex-col gap-3">

          {/* Campo para adicionar nova mensagem */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newAnnouncement}
              onChange={(e) => setNewAnnouncement(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAnnouncement() } }}
              placeholder="Ex: Frete grátis acima de R$ 150 🚚"
              className={inputClass}
            />
            <button
              type="button"
              onClick={addAnnouncement}
              disabled={!newAnnouncement.trim()}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gray-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-40"
            >
              <Plus size={15} />
              Adicionar
            </button>
          </div>

          {/* Lista de mensagens cadastradas */}
          {form.announcements.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-gray-200 px-4 py-4 text-xs text-gray-400">
              <Megaphone size={14} />
              Nenhuma mensagem adicionada — a barra não será exibida.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {form.announcements.map((msg, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2"
                >
                  {/* Número de ordem */}
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-500">
                    {index + 1}
                  </span>
                  <p className="flex-1 text-sm text-gray-700">{msg}</p>
                  <button
                    onClick={() => removeAnnouncement(index)}
                    aria-label="Remover mensagem"
                    className="shrink-0 text-gray-300 transition-colors hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Preview da barra */}
          {form.announcements.length > 0 && (
            <div
              className="rounded-xl py-2 text-center text-xs font-medium"
              style={{ backgroundColor: form.themeColor, color: isLight(form.themeColor) ? '#111827' : '#ffffff' }}
            >
              {form.announcements[0]}
              {form.announcements.length > 1 && (
                <span className="ml-2 opacity-60">+{form.announcements.length - 1} mais</span>
              )}
            </div>
          )}
        </div>
      </Section>

      {/* ── Cor do tema ── */}
      <Section title="Cor do tema" hint="Aplicada nos botões e acentos do catálogo público">
        <div className="flex flex-col gap-3">

          {/* Cores predefinidas */}
          <div className="flex flex-wrap gap-2">
            {THEME_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                onClick={() => set('themeColor', c.value)}
                className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: c.value,
                  borderColor: form.themeColor === c.value ? '#6b7280' : 'transparent',
                  outline: form.themeColor === c.value ? '2px solid #6b7280' : 'none',
                  outlineOffset: '2px',
                }}
              />
            ))}

            {/* Input de cor livre */}
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-1.5">
              <input
                type="color"
                value={form.themeColor}
                onChange={(e) => set('themeColor', e.target.value)}
                className="h-5 w-5 cursor-pointer rounded border-none bg-transparent p-0"
                title="Cor personalizada"
              />
              <span className="font-mono text-xs text-gray-500">{form.themeColor}</span>
            </div>
          </div>

          {/* Preview do cabeçalho e botões */}
          <div className="overflow-hidden rounded-xl border border-gray-100">
            {/* Miniatura do header */}
            <div
              className="flex items-center justify-between px-4 py-2.5 text-xs font-semibold"
              style={{
                backgroundColor: form.themeColor,
                color: isLight(form.themeColor) ? '#111827' : '#ffffff',
              }}
            >
              <span>Nome da loja</span>
              <div className="flex items-center gap-3 opacity-80">
                <span>Ofertas</span>
                <span>Favoritos</span>
                <span>Sacola</span>
              </div>
            </div>
            {/* Botões do catálogo */}
            <div className="flex items-center gap-3 bg-gray-50 p-3">
              <button
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white"
                style={{ backgroundColor: form.themeColor }}
              >
                Adicionar à sacola
              </button>
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: form.themeColor }}
              >
                3
              </span>
              <span className="text-xs text-gray-400">Pré-visualização</span>
            </div>
          </div>
        </div>
      </Section>

      {/* Mensagens de feedback */}
      {saveError && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{saveError}</p>
      )}
      {saveSuccess && (
        <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          Perfil salvo com sucesso!
        </p>
      )}

      {/* Botão salvar */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-colors disabled:opacity-60"
        style={{ backgroundColor: 'var(--color-primary, #000000)' }}
      >
        <Save size={16} />
        {isSaving ? 'Salvando...' : 'Salvar perfil'}
      </button>
    </div>
  )
}

// ── Componentes auxiliares ──────────────────────────────────────────────────

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</p>
        {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function FormField({
  label,
  optional,
  hint,
  children,
}: {
  label: string
  optional?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1 text-sm font-medium text-gray-700">
        {label}
        {optional && <span className="text-xs font-normal text-gray-400">(opcional)</span>}
      </label>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
      {children}
    </div>
  )
}

// Área de upload da logo com preview
function LogoUploader({
  value,
  storeName,
  onChange,
}: {
  value: string
  storeName: string
  onChange: (url: string) => void
}) {
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [chooserOpen, setChooserOpen] = useState(false)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      // Comprime e redimensiona antes de enviar — mantém o tamanho dentro do limite da API
      onChange(await compressImage(file))
    } catch {
      // Se a compressão falhar, envia o arquivo original como base64
      const reader = new FileReader()
      reader.onload = () => onChange(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
    if (galleryInputRef.current) galleryInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  return (
    <>
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

      <div className="flex items-center gap-4">
        {/* Preview circular da logo */}
        <div
          onClick={() => setChooserOpen(true)}
          className="relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-gray-200 bg-gray-50 transition-colors hover:border-gray-400"
        >
          {value ? (
            <>
              <img src={value} alt="Logo" className="h-full w-full object-cover" />
              <button
                onClick={handleRemove}
                aria-label="Remover logo"
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100"
              >
                <X size={18} className="text-white" />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1 text-gray-400">
              <ImagePlus size={20} strokeWidth={1.5} />
              <span className="text-[10px]">Logo</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-gray-700">{storeName}</p>
          <p className="text-xs text-gray-400">
            {value ? 'Clique na imagem para trocar' : 'Clique para adicionar uma logo'}
          </p>
          <p className="text-xs text-gray-400">PNG ou JPG recomendado</p>
        </div>
      </div>

      {/* Seletor de origem */}
      {chooserOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setChooserOpen(false)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="border-b px-5 py-4 text-sm font-semibold text-gray-700">
              Como deseja adicionar a logo?
            </p>
            <div className="flex flex-col divide-y">
              <button
                onClick={() => { setChooserOpen(false); galleryInputRef.current?.click() }}
                className="flex items-center gap-3 px-5 py-4 text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                <ImagePlus size={18} className="text-gray-400" />
                Escolher da galeria
              </button>
              <button
                onClick={() => { setChooserOpen(false); cameraInputRef.current?.click() }}
                className="flex items-center gap-3 px-5 py-4 text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Camera size={18} className="text-gray-400" />
                Tirar uma foto
              </button>
              <button
                onClick={() => setChooserOpen(false)}
                className="px-5 py-4 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Determina se a cor hex é clara (para usar texto escuro por cima no preview)
function isLight(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 155
}

const inputClass =
  'w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-gray-900 focus:ring-1 focus:ring-gray-900'
