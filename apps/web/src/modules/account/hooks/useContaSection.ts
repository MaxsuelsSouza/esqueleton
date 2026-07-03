'use client'

// Lógica da seção "Dados e conta" exibida no perfil da loja (LGPD):
// exportar todos os dados da loja e excluir a conta definitivamente
import { useState } from 'react'
import { useAdminAuth } from '@/modules/auth/hooks/useAdminAuth'
import { storeAccountService } from '../services/store-account.service'

export function useContaSection() {
  const { token, isOwner } = useAdminAuth()

  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  // Modal de exclusão da loja — pede a senha atual como confirmação
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Baixa o dump JSON com todos os dados da loja (portabilidade — art. 18, V)
  async function handleExport() {
    if (!token) return
    setExportError(null)
    setExporting(true)
    try {
      const data = await storeAccountService.exportStore(token)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `minha-loja-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message ?? ''
      setExportError(message || 'Erro ao exportar os dados. Tente novamente.')
    } finally {
      setExporting(false)
    }
  }

  function openDeleteModal() {
    setDeleteModalOpen(true)
    setDeletePassword('')
    setDeleteError(null)
  }

  function closeDeleteModal() {
    setDeleteModalOpen(false)
  }

  // Exclui a loja e encerra a sessão — todos os dados são apagados em cascata
  async function handleConfirmDelete(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setDeleteError(null)
    setDeleting(true)
    try {
      await storeAccountService.deleteStore(deletePassword, token)
      // Loja excluída — limpa a sessão e volta para a página inicial
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_store_slug')
      localStorage.removeItem('admin_store_name')
      localStorage.removeItem('admin_email_verified')
      window.location.href = '/'
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status
      const message = (err as { message?: string })?.message ?? ''
      setDeleteError(
        status === 403
          ? 'Senha incorreta.'
          : message || 'Erro ao excluir a loja. Tente novamente.',
      )
      setDeleting(false)
    }
  }

  return {
    isOwner,
    exporting,
    exportError,
    handleExport,
    deleteModalOpen,
    deletePassword,
    setDeletePassword,
    deleting,
    deleteError,
    openDeleteModal,
    closeDeleteModal,
    handleConfirmDelete,
  }
}
