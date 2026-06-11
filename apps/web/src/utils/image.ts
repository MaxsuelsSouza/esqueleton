// Comprime e redimensiona uma imagem no navegador antes de enviar.
// As imagens são enviadas embutidas (base64) no corpo da requisição, então reduzir
// o tamanho aqui evita o erro de "imagem muito grande" da API e deixa o catálogo mais leve.
// Retorna uma data URL pronta para salvar.

// Maior lado da imagem, em pixels — suficiente para um card de produto nítido
const MAX_DIMENSION = 1200
// Qualidade da compressão (0 a 1) — 0.82 equilibra nitidez e tamanho
const QUALITY = 0.82

export async function compressImage(file: File): Promise<string> {
  // Arquivos que não são imagem, ou SVG (que não rasteriza bem), voltam sem alteração
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return readAsDataUrl(file)
  }

  const originalDataUrl = await readAsDataUrl(file)
  const image = await loadImage(originalDataUrl)

  // Calcula as novas dimensões mantendo a proporção (nunca aumenta a imagem)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height))
  const width = Math.round(image.width * scale)
  const height = Math.round(image.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  // Sem suporte a canvas: envia a imagem original
  if (!context) return originalDataUrl

  context.drawImage(image, 0, 0, width, height)

  // webp comprime bem e preserva transparência (útil para logos).
  // Navegadores sem suporte devolvem outro formato — nesse caso usamos jpeg para garantir a compressão.
  let compressed = canvas.toDataURL('image/webp', QUALITY)
  if (!compressed.startsWith('data:image/webp')) {
    compressed = canvas.toDataURL('image/jpeg', QUALITY)
  }

  // Se a compressão não reduziu o tamanho (imagem já pequena), mantém a original
  return compressed.length < originalDataUrl.length ? compressed : originalDataUrl
}

// Lê um arquivo como data URL (base64)
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

// Carrega uma imagem a partir de uma data URL para poder desenhá-la no canvas
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Não foi possível carregar a imagem'))
    image.src = src
  })
}
