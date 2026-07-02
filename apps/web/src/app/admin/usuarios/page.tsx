'use client'

// Página de gestão da equipe — apenas o OWNER pode acessar
// Lista os usuários da loja, permite convidar (criar) e remover membros
import { Trash2, UserPlus, Shield, Users, KeyRound, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { useUsuariosPage } from './page.hooks'

export default function UsuariosPage() {
  const {
    users,
    loading,
    error,
    isChecking,
    showInvite,
    setShowInvite,
    inviteName,
    setInviteName,
    inviteEmail,
    setInviteEmail,
    invitePassword,
    setInvitePassword,
    inviting,
    inviteError,
    deletingId,
    generatedPassword,
    generatedPasswordUserName,
    resettingId,
    handleInvite,
    handleDelete,
    handleResetPassword,
    dismissGeneratedPassword,
  } = useUsuariosPage()

  if (isChecking || loading) {
    return <div className="flex min-h-[50vh] items-center justify-center" />
  }

  const inputClass =
    'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10'

  return (
    <div className="mx-auto max-w-2xl">
      {/* Cabeçalho com título e botão de convidar */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Equipe</h1>
          <p className="text-sm text-gray-400">Gerencie quem tem acesso ao painel da sua loja.</p>
        </div>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700"
        >
          <UserPlus size={16} />
          Convidar
        </button>
      </div>

      {/* Formulário de convite — aparece ao clicar em "Convidar" */}
      {showInvite && (
        <form onSubmit={handleInvite} className="mb-6 rounded-2xl border border-gray-100 bg-white p-5">
          <p className="mb-4 text-sm font-medium text-gray-700">Convidar novo membro</p>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="Nome do membro (opcional)"
              maxLength={120}
              className={inputClass}
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="E-mail do membro"
                required
                className={inputClass}
              />
              <input
                type="password"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
                placeholder="Senha temporária"
                required
                minLength={8}
                className={inputClass}
              />
              <button
                type="submit"
                disabled={inviting}
                className="shrink-0 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-50"
              >
                {inviting ? '...' : 'Enviar'}
              </button>
            </div>
          </div>
          {inviteError && (
            <p className="mt-3 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-500">{inviteError}</p>
          )}
        </form>
      )}

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-500">{error}</p>
      )}

      {/* Modal com a senha temporária gerada — exibida uma única vez para o OWNER copiar */}
      {generatedPassword && (
        <GeneratedPasswordModal
          password={generatedPassword}
          userName={generatedPasswordUserName ?? ''}
          onClose={dismissGeneratedPassword}
        />
      )}

      {/* Lista de membros da equipe */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        {users.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-gray-400">
            <Users size={32} />
            <p className="text-sm">Nenhum membro encontrado.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {users.map((user) => (
              <li key={user.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  {/* Ícone de escudo para o OWNER */}
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    user.role === 'OWNER' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <Shield size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {user.name || user.email}
                    </p>
                    <p className="text-xs text-gray-400">
                      {user.name && <>{user.email} · </>}
                      {user.role === 'OWNER' ? 'Proprietário' : 'Equipe'}
                      {user.emailVerified === false && ' · E-mail não verificado'}
                    </p>
                  </div>
                </div>

                {/* Ações — não aparecem para o OWNER (não pode remover/resetar a si mesmo) */}
                {user.role !== 'OWNER' && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleResetPassword(user.id)}
                      disabled={resettingId === user.id}
                      className="rounded-lg p-2 text-gray-300 transition-colors hover:bg-amber-50 hover:text-amber-600 disabled:opacity-50"
                      title="Resetar senha"
                    >
                      <KeyRound size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      disabled={deletingId === user.id}
                      className="rounded-lg p-2 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                      title="Remover membro"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// Modal que exibe a senha temporária gerada — o OWNER precisa copiar e enviar ao membro
function GeneratedPasswordModal({
  password,
  userName,
  onClose,
}: {
  password: string
  userName: string
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback — seleciona o texto para o usuário copiar manualmente
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-base font-semibold text-gray-900">Senha resetada</h2>
        <p className="mb-4 text-sm text-gray-500">
          A nova senha temporária de <strong>{userName}</strong> é:
        </p>

        {/* Campo com a senha gerada + botão de copiar */}
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <code className="flex-1 text-center text-lg font-mono font-semibold tracking-wider text-gray-900">
            {password}
          </code>
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700"
            title="Copiar senha"
          >
            {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
          </button>
        </div>

        <p className="mb-5 text-xs text-gray-400">
          Envie esta senha ao membro. No próximo login, ele será obrigado a criar uma nova senha.
        </p>

        <button
          onClick={onClose}
          className="w-full rounded-xl bg-gray-900 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700"
        >
          Entendi
        </button>
      </div>
    </div>
  )
}
