// Categorias de exemplo para demonstração de loja de eletrônicos
import type { Category } from '@esqueleton/shared'

export const MOCK_CATEGORIES: Category[] = [
  {
    id: 'smartphones',
    name: 'Smartphones',
    parentId: null,
    children: [
      { id: 'smartphones-android', name: 'Android', parentId: 'smartphones' },
      { id: 'smartphones-ios', name: 'iPhone', parentId: 'smartphones' },
      { id: 'smartphones-basicos', name: 'Básicos', parentId: 'smartphones' },
    ],
  },
  {
    id: 'acessorios-celular',
    name: 'Acessórios para Celular',
    parentId: null,
    children: [
      { id: 'capinhas', name: 'Capinhas', parentId: 'acessorios-celular' },
      { id: 'peliculas', name: 'Películas', parentId: 'acessorios-celular' },
      { id: 'suportes', name: 'Suportes & Apoios', parentId: 'acessorios-celular' },
      { id: 'pop-socket', name: 'Pop Socket', parentId: 'acessorios-celular' },
    ],
  },
  {
    id: 'carregadores',
    name: 'Carregadores & Cabos',
    parentId: null,
    children: [
      { id: 'carregadores-turbo', name: 'Carregamento Turbo', parentId: 'carregadores' },
      { id: 'carregadores-wireless', name: 'Carregamento sem fio', parentId: 'carregadores' },
      { id: 'carregadores-veicular', name: 'Veicular', parentId: 'carregadores' },
      { id: 'cabos-usb', name: 'Cabos USB', parentId: 'carregadores' },
      { id: 'power-bank', name: 'Power Bank', parentId: 'carregadores' },
    ],
  },
  {
    id: 'audio',
    name: 'Áudio',
    parentId: null,
    children: [
      { id: 'fones-sem-fio', name: 'Fones sem fio (TWS)', parentId: 'audio' },
      { id: 'fones-com-fio', name: 'Fones com fio', parentId: 'audio' },
      { id: 'headphones', name: 'Headphones', parentId: 'audio' },
      { id: 'caixas-bluetooth', name: 'Caixas de som Bluetooth', parentId: 'audio' },
    ],
  },
  {
    id: 'notebooks',
    name: 'Notebooks',
    parentId: null,
    children: [
      { id: 'notebooks-gamer', name: 'Gamer', parentId: 'notebooks' },
      { id: 'notebooks-ultrafino', name: 'Ultrafino', parentId: 'notebooks' },
      { id: 'notebooks-custo-beneficio', name: 'Custo-benefício', parentId: 'notebooks' },
    ],
  },
  {
    id: 'acessorios-notebook',
    name: 'Acessórios para Notebook',
    parentId: null,
    children: [
      { id: 'mouses', name: 'Mouses', parentId: 'acessorios-notebook' },
      { id: 'teclados', name: 'Teclados', parentId: 'acessorios-notebook' },
      { id: 'mochilas-notebook', name: 'Mochilas & Cases', parentId: 'acessorios-notebook' },
      { id: 'hubs-adaptadores', name: 'Hubs & Adaptadores', parentId: 'acessorios-notebook' },
    ],
  },
  {
    id: 'tablets',
    name: 'Tablets',
    parentId: null,
    children: [
      { id: 'tablets-android', name: 'Android', parentId: 'tablets' },
      { id: 'tablets-ipad', name: 'iPad', parentId: 'tablets' },
    ],
  },
  {
    id: 'smartwatch',
    name: 'Smartwatch & Pulseiras',
    parentId: null,
    children: [
      { id: 'smartwatch-android', name: 'Android Wear', parentId: 'smartwatch' },
      { id: 'smartwatch-apple', name: 'Apple Watch', parentId: 'smartwatch' },
      { id: 'pulseiras-fitness', name: 'Pulseiras fitness', parentId: 'smartwatch' },
    ],
  },
  {
    id: 'games',
    name: 'Games & Consoles',
    parentId: null,
    children: [
      { id: 'consoles', name: 'Consoles', parentId: 'games' },
      { id: 'controles', name: 'Controles', parentId: 'games' },
      { id: 'headset-gamer', name: 'Headset Gamer', parentId: 'games' },
      { id: 'cadeiras-gamer', name: 'Cadeiras Gamer', parentId: 'games' },
    ],
  },
  {
    id: 'redes',
    name: 'Redes & Conectividade',
    parentId: null,
    children: [
      { id: 'roteadores', name: 'Roteadores', parentId: 'redes' },
      { id: 'repetidores', name: 'Repetidores Wi-Fi', parentId: 'redes' },
      { id: 'switches', name: 'Switches', parentId: 'redes' },
    ],
  },
  {
    id: 'tv-video',
    name: 'TV & Vídeo',
    parentId: null,
    children: [
      { id: 'smart-tv', name: 'Smart TV', parentId: 'tv-video' },
      { id: 'streaming', name: 'Streaming (Chromecast, Fire TV)', parentId: 'tv-video' },
      { id: 'projetores', name: 'Projetores', parentId: 'tv-video' },
    ],
  },
  {
    id: 'fotografias',
    name: 'Foto & Vídeo',
    parentId: null,
    children: [
      { id: 'cameras', name: 'Câmeras', parentId: 'fotografias' },
      { id: 'drones', name: 'Drones', parentId: 'fotografias' },
      { id: 'acessorios-foto', name: 'Tripés & Acessórios', parentId: 'fotografias' },
    ],
  },
]
