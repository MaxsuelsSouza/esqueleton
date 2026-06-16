// Validação aritmética de pedidos — confere que os totais não foram manipulados

type OrderItem = {
  lineTotal: number
  unitPrice: number
  quantity: number
}

type OrderData = {
  items: OrderItem[]
  subtotal: number
  discount: number
  total: number
}

// Confere a aritmética do pedido — impede totais manipulados por requisições
// montadas fora do site (tolerância de 1 centavo para arredondamentos)
export function validateOrderArithmetic(data: OrderData): boolean {
  const somaDosItens = data.items.reduce((soma, item) => soma + item.lineTotal, 0)
  const itemComContaErrada = data.items.some(
    (item) => Math.abs(item.lineTotal - item.unitPrice * item.quantity) > 0.01
  )
  const subtotalNaoConfere = Math.abs(data.subtotal - somaDosItens) > 0.01
  const totalNaoConfere =
    data.discount > data.subtotal || Math.abs(data.total - (data.subtotal - data.discount)) > 0.01

  return !itemComContaErrada && !subtotalNaoConfere && !totalNaoConfere
}
