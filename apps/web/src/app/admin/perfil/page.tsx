'use client'

// Página de configurações da loja — nome, contato, logo e cor do tema
import { useRef, useState } from 'react'
import { ImagePlus, Camera, X, Save, Store, Plus, Megaphone, MessageCircle, RefreshCw, CheckCircle2, XCircle, AlertTriangle, ExternalLink, ChevronDown } from 'lucide-react'
import { compressImage } from '@/modules/catalog/utils/image'
import { usePerfilPage } from './page.hooks'

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

// Etapas do guia de configuração do WhatsApp Business
const WHATSAPP_GUIDE_STEPS: {
  number: number
  title: string
  images: { src: string; alt: string }[]
  instructions: string[]
  link: string
  linkLabel: string
  field?: 'metaCatalogId' | 'metaAccessToken' | 'metaWabaId'
}[] = [
  {
    number: 1,
    title: 'Criar portfólio no Meta Business',
    images: [
      { src: '/images/whatsapp-guide/step-1-criar-conta.png', alt: 'Tela do Meta Business Suite' },
    ],
    instructions: [
      'Acesse business.facebook.com e faça login com seu Facebook.',
      'Se ainda não tiver um portfólio empresarial, clique em "Criar portfólio empresarial".',
      'Preencha o nome da sua empresa e confirme seu e-mail.',
      'Se já possui um portfólio, prossiga para o próximo passo.',
    ],
    link: 'https://business.facebook.com',
    linkLabel: 'Abrir Meta Business Suite',
  },
  {
    number: 2,
    title: 'Criar catálogo de produtos',
    images: [
      { src: '/images/whatsapp-guide/step-2-criar-catalogo.png', alt: 'Commerce Manager — criar catálogo e encontrar o ID' },
    ],
    instructions: [
      'No link abaixo, acesse o Gerenciador de Comércio (Commerce Manager).',
      'Se ainda não tiver um catálogo, clique no botão "+" ao lado de "Catálogos" para criar um novo.',
      'Na seção "Catálogos", seu catálogo aparecerá listado com o nome e o "ID do catálogo" logo abaixo.',
      'Copie o número do ID do catálogo e cole no campo abaixo.',
    ],
    link: 'https://business.facebook.com/commerce',
    linkLabel: 'Abrir Gerenciador de Comércio',
    field: 'metaCatalogId',
  },
  {
    number: 3,
    title: 'Registrar-se como desenvolvedor e criar app',
    images: [
      { src: '/images/whatsapp-guide/step-3-criar-app.png', alt: 'Registro no Meta for Developers e criação do app' },
    ],
    instructions: [
      'Acesse developers.facebook.com e clique em "Começar" (canto superior direito).',
      'Complete o cadastro: verifique seu número de celular com o código SMS enviado pela Meta.',
      'Após verificar, preencha as informações de contato e finalize o registro.',
      'Já registrado, vá em "Meus apps" → "Criar app".',
      'Dê um nome ao app (ex: "Minha Loja") e vincule ao seu portfólio empresarial.',
      'Sem este app, o passo seguinte ficará bloqueado.',
    ],
    link: 'https://developers.facebook.com',
    linkLabel: 'Abrir Meta for Developers',
  },
  {
    number: 4,
    title: 'Gerar token de acesso',
    images: [
      { src: '/images/whatsapp-guide/step-4a-criar-usuario.png', alt: 'Criar usuário do sistema no Meta Business' },
      { src: '/images/whatsapp-guide/step-4b-gerar-token.png', alt: 'Selecionar permissões catalog_management e whatsapp_business_management' },
      { src: '/images/whatsapp-guide/step-4c-copiar-token.png', alt: 'Copiar o token gerado' },
    ],
    instructions: [
      'No link abaixo, vá em Configurações → Usuários → Usuários do sistema.',
      'Clique em "Adicionar" (o botão só funciona se o app do passo 3 já existir no portfólio).',
      'Crie um usuário do tipo "Admin".',
      'Clique no usuário criado e depois em "Gerar token".',
      'Selecione o app que você criou no passo anterior.',
      'Marque as permissões: catalog_management e whatsapp_business_management.',
      'Clique em "Gerar token" e copie imediatamente — o token não será exibido novamente!',
    ],
    link: 'https://business.facebook.com/settings/system-users',
    linkLabel: 'Abrir Usuários do Sistema',
    field: 'metaAccessToken',
  },
  {
    number: 5,
    title: 'Vincular conta WhatsApp (opcional)',
    images: [
      { src: '/images/whatsapp-guide/step-5-waba-id.png', alt: 'Configurações — vincular conta do WhatsApp Business' },
    ],
    instructions: [
      'No link abaixo, vá em Configurações → Contas → Contas do WhatsApp.',
      'Clique em "+ Adicionar" para vincular sua conta WhatsApp Business.',
      'A Meta enviará um código de verificação para o app WhatsApp Business no seu celular.',
      'Digite o código e clique em "Continuar".',
      'Após vincular, copie o ID da conta que aparecerá na listagem.',
      'Se você não usa o WhatsApp Business, pode pular esta etapa sem problemas.',
    ],
    link: 'https://business.facebook.com/settings/whatsapp-business-accounts',
    linkLabel: 'Abrir Contas do WhatsApp',
    field: 'metaWabaId',
  },
]

export default function AdminPerfilPage() {
  const {
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
    guideStep,
    setGuideStep,
    whatsappStatus,
    isTesting,
    testResult,
    handleTestWhatsApp,
    isSyncing,
    syncResult,
    handleSyncWhatsApp,
  } = usePerfilPage()

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

      {/* ── Catálogo WhatsApp Business (expansível) ── */}
      <div className="flex flex-col rounded-2xl border border-gray-100 bg-white">
        {/* Cabeçalho com toggle — sempre visível */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <MessageCircle size={18} className={form.whatsappCatalogEnabled ? 'text-green-600' : 'text-gray-400'} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Catálogo WhatsApp</p>
              <p className="mt-0.5 text-xs text-gray-400">
                {form.whatsappCatalogEnabled ? 'Sincronização ativa' : 'Sincronize seus produtos com o WhatsApp Business'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => set('whatsappCatalogEnabled', !form.whatsappCatalogEnabled)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${form.whatsappCatalogEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${form.whatsappCatalogEnabled ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform duration-200 ${form.whatsappCatalogEnabled ? 'rotate-180' : ''}`}
            />
          </div>
        </div>

        {/* Conteúdo expansível — visível apenas quando ativado */}
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${form.whatsappCatalogEnabled ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
        >
          <div className="overflow-hidden">
            <div className="flex flex-col gap-4 border-t border-gray-100 p-4">

              {/* ── Guia passo-a-passo ── */}
              <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Guia de configuração
                </p>

                {/* Indicadores de etapa */}
                <div className="flex items-center gap-1">
                  {WHATSAPP_GUIDE_STEPS.map((step) => (
                    <button
                      key={step.number}
                      type="button"
                      onClick={() => setGuideStep(step.number)}
                      className={`flex h-8 flex-1 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                        guideStep === step.number
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {step.number}
                    </button>
                  ))}
                </div>

                {/* Conteúdo da etapa ativa */}
                {WHATSAPP_GUIDE_STEPS.filter((s) => s.number === guideStep).map((step) => (
                  <div key={step.number} className="flex flex-col gap-3">
                    <p className="text-sm font-semibold text-gray-700">
                      Passo {step.number} de {WHATSAPP_GUIDE_STEPS.length}: {step.title}
                    </p>

                    {/* Imagens ilustrativas */}
                    <div className="flex flex-col gap-2">
                      {step.images.map((img, i) => (
                        <img
                          key={i}
                          src={img.src}
                          alt={img.alt}
                          loading="lazy"
                          className="w-full rounded-xl border border-gray-200"
                        />
                      ))}
                    </div>

                    {/* Instruções */}
                    <ol className="flex flex-col gap-1.5 pl-4">
                      {step.instructions.map((instruction, i) => (
                        <li key={i} className="list-decimal text-sm text-gray-600">
                          {instruction}
                        </li>
                      ))}
                    </ol>

                    {/* Link direto */}
                    <a
                      href={step.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-100"
                    >
                      <ExternalLink size={14} />
                      {step.linkLabel}
                    </a>

                    {/* Campo relacionado à etapa (quando aplicável) */}
                    {step.field === 'metaCatalogId' && (
                      <FormField label="ID do catálogo" hint="Cole aqui o número que você copiou acima">
                        <input
                          type="text"
                          value={form.metaCatalogId}
                          onChange={(e) => set('metaCatalogId', e.target.value)}
                          placeholder="Ex: 1234567890"
                          className={inputClass}
                        />
                      </FormField>
                    )}
                    {step.field === 'metaAccessToken' && (
                      <FormField label="Token de acesso" hint="Cole aqui o token que você acabou de copiar">
                        <input
                          type="password"
                          value={form.metaAccessToken}
                          onChange={(e) => set('metaAccessToken', e.target.value)}
                          placeholder="EAA..."
                          className={inputClass}
                        />
                      </FormField>
                    )}
                    {step.field === 'metaWabaId' && (
                      <FormField label="ID da conta WhatsApp Business" optional hint="Cole aqui o ID (pule se não tiver)">
                        <input
                          type="text"
                          value={form.metaWabaId}
                          onChange={(e) => set('metaWabaId', e.target.value)}
                          placeholder="Ex: 9876543210"
                          className={inputClass}
                        />
                      </FormField>
                    )}

                    {/* Navegação entre etapas */}
                    <div className="flex justify-between">
                      <button
                        type="button"
                        onClick={() => setGuideStep(guideStep - 1)}
                        disabled={guideStep === 1}
                        className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 disabled:invisible"
                      >
                        <ChevronDown size={14} className="rotate-90" />
                        Anterior
                      </button>
                      {guideStep < WHATSAPP_GUIDE_STEPS.length ? (
                        <button
                          type="button"
                          onClick={() => setGuideStep(guideStep + 1)}
                          className="flex items-center gap-1 rounded-xl bg-gray-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
                        >
                          Próximo
                          <ChevronDown size={14} className="-rotate-90" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleTestWhatsApp}
                          disabled={isTesting || !form.metaAccessToken || !form.metaCatalogId}
                          className="flex items-center gap-1.5 rounded-xl bg-green-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-40"
                        >
                          {isTesting ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                          {isTesting ? 'Testando...' : 'Testar conexão'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Ações e status (abaixo do guia) ── */}
              <div className="flex flex-col gap-3 border-t border-gray-100 pt-4">
                {/* Botões de ação */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleTestWhatsApp}
                    disabled={isTesting || !form.metaAccessToken || !form.metaCatalogId}
                    className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40"
                  >
                    {isTesting ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    {isTesting ? 'Testando...' : 'Testar conexão'}
                  </button>

                  <button
                    type="button"
                    onClick={handleSyncWhatsApp}
                    disabled={isSyncing || !form.metaAccessToken || !form.metaCatalogId}
                    className="flex items-center gap-1.5 rounded-xl bg-green-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-40"
                  >
                    {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    {isSyncing ? 'Sincronizando...' : 'Sincronizar todos'}
                  </button>
                </div>

                {/* Resultado do teste */}
                {testResult && (
                  <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${testResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {testResult.ok ? (
                      <><CheckCircle2 size={16} /> Conexão estabelecida com sucesso!</>
                    ) : (
                      <><XCircle size={16} /> {testResult.error ?? 'Falha na conexão'}</>
                    )}
                  </div>
                )}

                {/* Resultado da sincronização */}
                {syncResult && (
                  <div className="flex flex-col gap-1.5 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
                    <p className="font-medium">Sincronização concluída</p>
                    <p>{syncResult.synced} de {syncResult.total} produtos sincronizados</p>
                    {syncResult.skipped > 0 && (
                      <p className="flex items-center gap-1 text-amber-600">
                        <AlertTriangle size={14} />
                        {syncResult.skipped} produtos ignorados (imagem em base64)
                      </p>
                    )}
                    {syncResult.failed > 0 && (
                      <p className="text-red-600">{syncResult.failed} falharam</p>
                    )}
                  </div>
                )}

                {/* Status da conexão */}
                {whatsappStatus && (
                  <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${whatsappStatus.connected ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                    <div className={`h-2 w-2 rounded-full ${whatsappStatus.connected ? 'bg-green-500' : 'bg-gray-400'}`} />
                    {whatsappStatus.connected ? (
                      <span>{whatsappStatus.syncedProducts} produtos no catálogo do WhatsApp</span>
                    ) : (
                      <span>{whatsappStatus.error ?? 'Desconectado'}</span>
                    )}
                    {whatsappStatus.skippedProducts > 0 && (
                      <span className="text-xs text-amber-600">({whatsappStatus.skippedProducts} sem URL de imagem)</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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
