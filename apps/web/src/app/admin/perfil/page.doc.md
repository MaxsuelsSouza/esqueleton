# Perfil da Loja

Pagina de configuracoes do perfil da loja — nome, endereco, contato, logo, barra de avisos e cor do tema.

## Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `page.tsx` | Renderiza o formulario de perfil em secoes: Logo (upload circular), Informacoes (nome, endereco), Contato (WhatsApp, Instagram), Barra de avisos (lista de mensagens com preview), Cor do tema (paleta predefinida + personalizada com preview de header e botoes). Sub-componentes: LogoUploader, Section, FormField, funcao utilitaria `isLight`. |
| `page.hooks.ts` | Carrega o perfil da loja via `storeProfileService.getProfile` e preenche o formulario. Gerencia a lista de mensagens de aviso, aplicacao em tempo real da cor do tema via CSS variable, validacao e envio do formulario via `storeProfileService.updateProfile`. |

## Fluxo de dados

1. `usePerfilPage()` chama `storeProfileService.getProfile` ao montar com o token do admin.
2. Quando o perfil carrega, o `useEffect` preenche o formulario com os dados recebidos.
3. Ao alterar a cor do tema, o hook aplica imediatamente via `document.documentElement.style.setProperty('--color-primary', value)`.
4. Ao salvar, chama `storeProfileService.updateProfile` e atualiza o estado local com o retorno.

## Estados gerenciados

| Estado | Tipo | Descricao |
|--------|------|-----------|
| `form.storeName` | `string` | Nome da loja |
| `form.address` | `string` | Endereco |
| `form.whatsapp` | `string` | Numero de WhatsApp |
| `form.instagram` | `string` | Arroba do Instagram |
| `form.logoUrl` | `string` | URL ou base64 da logo |
| `form.themeColor` | `string` | Cor do tema em hex |
| `form.announcements` | `string[]` | Lista de mensagens da barra de avisos |
| `newAnnouncement` | `string` | Texto da nova mensagem sendo digitada |
| `isSaving` | `boolean` | Salvamento em andamento |
| `saveError` | `string \| null` | Erro ao salvar |
| `saveSuccess` | `boolean` | Feedback de sucesso (desaparece apos 3s) |

## Acoes do usuario

| Acao | Handler | O que faz |
|------|---------|-----------|
| Upload de logo | `LogoUploader.handleFileChange` | Comprime imagem e atualiza `form.logoUrl` |
| Remover logo | `LogoUploader.handleRemove` | Limpa `form.logoUrl` |
| Adicionar mensagem de aviso | `addAnnouncement` | Adiciona texto a lista de `announcements` |
| Remover mensagem de aviso | `removeAnnouncement` | Remove mensagem pelo indice |
| Selecionar cor do tema | `set('themeColor', value)` | Atualiza cor e aplica CSS variable em tempo real |
| Salvar perfil | `handleSave` | Valida nome, envia formulario e exibe feedback |

## Modulos utilizados

- `@/modules/store-profile/services/store-profile.service` — buscar e atualizar perfil da loja
- `@/modules/catalog/utils/image` — `compressImage` para comprimir a logo antes do upload

## Observacoes

- Esta pagina e restrita a OWNER (a rota da API `PUT /api/store-profile` exige `requireOwner`).
- A cor do tema e aplicada em tempo real no preview e propagada via CSS variable `--color-primary`.
- A barra de avisos rotaciona uma mensagem por vez no catalogo publico. O preview mostra a primeira mensagem e quantas mais existem.
- O upload de logo suporta galeria e camera (no mobile), com compressao automatica.
- A funcao `isLight` calcula se a cor hex e clara para decidir se o texto do preview deve ser escuro ou claro.
