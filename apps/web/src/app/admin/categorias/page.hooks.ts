'use client'

// Hook com toda a logica de estado e dados da pagina de categorias
import { useState, useEffect, useMemo } from 'react'
import { categoriesService } from '@/modules/categories/services/categories.service'
import { getMockCategories, setMockCategories } from '@/modules/categories/mocks/categories-store'
import { buildCategoryTree } from '@/modules/categories/utils/categories'
import type { Category } from '@esqueleton/shared'

// Troque para false quando a API estiver pronta
const USE_MOCK_DATA = false

export function useCategoriasPage() {
  // Estado interno como lista plana — mais fácil de manipular que uma árvore aninhada
  const [flatCategories, setFlatCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Monta a árvore a partir da lista plana para exibição
  const categoryTree = useMemo(() => buildCategoryTree(flatCategories), [flatCategories])

  // Controle do modal de criar/editar
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [parentForNew, setParentForNew] = useState<Category | null>(null)
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)

  // Controle da confirmação de exclusão
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    if (USE_MOCK_DATA) {
      setFlatCategories(getMockCategories())
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const data = await categoriesService.listCategories(localStorage.getItem('admin_token') ?? '')
      // A API retorna lista plana
      setFlatCategories(data)
    } finally {
      setIsLoading(false)
    }
  }

  function openCreateModal(parent: Category | null = null) {
    setEditingCategory(null)
    setParentForNew(parent)
    setName('')
    setNameError(null)
    setModalOpen(true)
  }

  function openEditModal(category: Category) {
    setEditingCategory(category)
    setParentForNew(null)
    setName(category.name)
    setNameError(null)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!name.trim()) {
      setNameError('O nome da categoria é obrigatório.')
      return
    }

    setIsSaving(true)
    setNameError(null)

    if (USE_MOCK_DATA) {
      setFlatCategories((prev) => {
        const next = editingCategory
          ? prev.map((c) => (c.id === editingCategory.id ? { ...c, name: name.trim() } : c))
          : [...prev, { id: `cat-${Date.now()}`, name: name.trim(), parentId: parentForNew?.id ?? null }]
        setMockCategories(next)
        return next
      })
      setIsSaving(false)
      setModalOpen(false)
      return
    }

    const token = localStorage.getItem('admin_token') ?? ''
    try {
      if (editingCategory) {
        await categoriesService.updateCategory(editingCategory.id, { name: name.trim() }, token)
      } else {
        await categoriesService.createCategory(
          { name: name.trim(), parentId: parentForNew?.id ?? null },
          token,
        )
      }
      setModalOpen(false)
      loadCategories()
    } catch {
      setNameError('Erro ao salvar. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingCategory) return

    setIsDeleting(true)

    if (USE_MOCK_DATA) {
      const toRemove = new Set<string>()
      function collectDescendants(id: string) {
        toRemove.add(id)
        flatCategories.filter((c) => c.parentId === id).forEach((c) => collectDescendants(c.id))
      }
      collectDescendants(deletingCategory.id)
      setFlatCategories((prev) => {
        const next = prev.filter((c) => !toRemove.has(c.id))
        setMockCategories(next)
        return next
      })
      setDeletingCategory(null)
      setIsDeleting(false)
      return
    }

    const token = localStorage.getItem('admin_token') ?? ''
    try {
      await categoriesService.deleteCategory(deletingCategory.id, token)
      setDeletingCategory(null)
      loadCategories()
    } finally {
      setIsDeleting(false)
    }
  }

  // Conta quantos descendentes uma categoria tem (para avisar na exclusão)
  function countDescendants(id: string): number {
    const children = flatCategories.filter((c) => c.parentId === id)
    return children.reduce((acc, c) => acc + 1 + countDescendants(c.id), 0)
  }

  return {
    flatCategories,
    isLoading,
    isSaving,
    isDeleting,
    categoryTree,
    modalOpen,
    setModalOpen,
    editingCategory,
    parentForNew,
    name,
    setName,
    nameError,
    deletingCategory,
    setDeletingCategory,
    openCreateModal,
    openEditModal,
    handleSave,
    handleDelete,
    countDescendants,
  }
}
