'use client'

// Área de upload de imagem — suporta clique (galeria/câmera) e arrastar arquivo.
// Usada na foto principal do produto e nas imagens de variante.
import { useState, useRef } from 'react'
import { X, ImagePlus, Camera } from 'lucide-react'
import { compressImage } from '../utils/image'

export function ImageUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [chooserOpen, setChooserOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  async function readFile(file: File) {
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) readFile(file)
  }

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
    if (galleryInputRef.current) galleryInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    // Só desativa quando o cursor sai da área por completo (não ao passar sobre filhos)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) readFile(file)
  }

  function handleClick() {
    // No desktop abre diretamente a galeria; no mobile mostra a pergunta galeria/câmera
    const isMobile = /Mobi|Android/i.test(navigator.userAgent)
    if (isMobile) {
      setChooserOpen(true)
    } else {
      galleryInputRef.current?.click()
    }
  }

  function pickGallery() {
    setChooserOpen(false)
    galleryInputRef.current?.click()
  }

  function pickCamera() {
    setChooserOpen(false)
    cameraInputRef.current?.click()
  }

  return (
    <>
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

      {/* Área de drop e clique */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex h-32 w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
          isDragging
            ? 'border-gray-900 bg-gray-100'
            : 'border-gray-200 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
        }`}
      >
        {value ? (
          <>
            <img src={value} alt="Preview" className="h-full w-full object-cover" />
            <button
              onClick={handleRemove}
              aria-label="Remover imagem"
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-black"
            >
              <X size={14} />
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-black/40 py-1.5 text-center text-xs text-white">
              {isDragging ? 'Solte para trocar' : 'Clique ou arraste para trocar'}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-gray-400">
            <ImagePlus size={24} strokeWidth={1.5} />
            <span className="text-xs font-medium">
              {isDragging ? 'Solte a imagem aqui' : 'Clique ou arraste uma foto'}
            </span>
          </div>
        )}
      </div>

      {/* Pergunta: galeria ou câmera (apenas mobile) */}
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
              Como deseja adicionar a foto?
            </p>
            <div className="flex flex-col divide-y">
              <button
                onClick={pickGallery}
                className="flex items-center gap-3 px-5 py-4 text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                <ImagePlus size={18} className="text-gray-400" />
                Escolher da galeria
              </button>
              <button
                onClick={pickCamera}
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
