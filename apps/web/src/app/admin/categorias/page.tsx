'use client'

// Página de gestão de categorias — árvore com criar, editar e excluir
import { useState, useEffect, useMemo } from 'react'
import { Plus, Pencil, Trash2, X, ChevronRight, ChevronDown, Tag } from 'lucide-react'
import { categoriesService } from '@/services/categories.service'
import { getMockCategories, setMockCategories } from '@/mocks/categories-store'
import { buildCategoryTree } from '@/utils/categories'
import type { Category } from '@esqueleton/shared'

// Troque para false quando a API estiver pronta
const USE_MOCK_DATA = false

export default function AdminCategoriasPage() {
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

  return (
    <div className="flex flex-col gap-6">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Categorias</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {flatCategories.length} categoria{flatCategories.length !== 1 ? 's' : ''} cadastrada{flatCategories.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => openCreateModal(null)}
          className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
        >
          <Plus size={16} />
          Nova categoria
        </button>
      </div>

      {/* Árvore de categorias */}
      {categoryTree.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-gray-400">
          <Tag size={40} strokeWidth={1.5} />
          <p className="text-sm">Nenhuma categoria cadastrada ainda.</p>
          <button
            onClick={() => openCreateModal(null)}
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Criar primeira categoria
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-4">
          <CategoryTreeView
            categories={categoryTree}
            onAddChild={openCreateModal}
            onEdit={openEditModal}
            onDelete={setDeletingCategory}
          />
        </div>
      )}

      {/* Modal de criar / editar */}
      {modalOpen && (
        <Modal
          title={editingCategory ? 'Editar categoria' : parentForNew ? `Nova subcategoria em "${parentForNew.name}"` : 'Nova categoria'}
          onClose={() => setModalOpen(false)}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                placeholder="Ex: Femininos"
                autoFocus
                className="rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
              />
              {nameError && <p className="text-xs text-red-500">{nameError}</p>}
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-60"
              >
                {isSaving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmação de exclusão */}
      {deletingCategory && (
        <Modal title="Excluir categoria" onClose={() => setDeletingCategory(null)}>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600">
              Tem certeza que deseja excluir{' '}
              <span className="font-semibold text-gray-900">"{deletingCategory.name}"</span>?
              {countDescendants(deletingCategory.id) > 0 && (
                <span className="mt-1 block text-orange-600">
                  Atenção: {countDescendants(deletingCategory.id)} subcategoria{countDescendants(deletingCategory.id) !== 1 ? 's' : ''} também será{countDescendants(deletingCategory.id) !== 1 ? 'ão' : ''} excluída{countDescendants(deletingCategory.id) !== 1 ? 's' : ''}.
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingCategory(null)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
              >
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Árvore de categorias para o admin ──────────────────────────────────────

interface CategoryTreeViewProps {
  categories: Category[]
  onAddChild: (parent: Category) => void
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
  level?: number
}

function CategoryTreeView({
  categories,
  onAddChild,
  onEdit,
  onDelete,
  level = 0,
}: CategoryTreeViewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(categories.map((c) => c.id)),
  )

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className={level > 0 ? 'ml-6 border-l border-gray-100 pl-3' : ''}>
      {categories.map((cat) => {
        const hasChildren = !!cat.children?.length
        const isExpanded = expandedIds.has(cat.id)

        return (
          <div key={cat.id} className="py-0.5">
            <div className="group flex items-center gap-1 rounded-lg px-1 py-1.5 transition-colors hover:bg-gray-50">

              {/* Botão expandir/recolher */}
              <button
                onClick={() => toggleExpand(cat.id)}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-400 hover:text-gray-600 ${!hasChildren ? 'invisible' : ''}`}
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {/* Nome da categoria */}
              <span className="flex-1 text-sm text-gray-800">{cat.name}</span>

              {/* Ações — visíveis ao passar o mouse */}
              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => onAddChild(cat)}
                  title="Adicionar subcategoria"
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <Plus size={12} />
                  Sub
                </button>
                <button
                  onClick={() => onEdit(cat)}
                  aria-label="Editar"
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => onDelete(cat)}
                  aria-label="Excluir"
                  className="rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Subcategorias */}
            {hasChildren && isExpanded && (
              <CategoryTreeView
                categories={cat.children!}
                onAddChild={onAddChild}
                onEdit={onEdit}
                onDelete={onDelete}
                level={level + 1}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Modal reutilizável ──────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}
