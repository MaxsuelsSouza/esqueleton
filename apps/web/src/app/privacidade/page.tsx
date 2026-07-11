// Política de Privacidade da plataforma — exigida pela LGPD (Lei nº 13.709/2018)
// O conteúdo segue o inventário de dados do plano de adequação (docs/LGPDPLANOIMPLEMENTACAO.md)
import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPageLayout } from '@/modules/legal/components/LegalPageLayout'
import { VERSAO_TERMOS, DATA_VIGENCIA_TERMOS, EMAIL_PRIVACIDADE } from '@/modules/legal/constants'

export const metadata: Metadata = {
  title: 'Política de Privacidade — Esqueleton',
  description: 'Como a plataforma Esqueleton coleta, usa e protege dados pessoais.',
}

export default function PrivacidadePage() {
  return (
    <LegalPageLayout
      title="Política de Privacidade"
      subtitle={`Versão ${VERSAO_TERMOS} — vigente a partir de ${DATA_VIGENCIA_TERMOS}`}
    >
      <section>
        <h2>1. Quem somos e qual o nosso papel</h2>
        <p className="mt-3">
          O Esqueleton é uma plataforma que permite a lojistas criarem catálogos online e
          receberem pedidos pelo WhatsApp. Pela Lei Geral de Proteção de Dados (LGPD),
          exercemos dois papéis diferentes:
        </p>
        <ul className="mt-3">
          <li>
            <strong>Controladora dos dados dos lojistas</strong> — quando você cria uma conta
            para a sua loja, nós decidimos como tratar seus dados de cadastro e cobrança.
          </li>
          <li>
            <strong>Operadora dos dados dos clientes finais</strong> — quando um cliente informa
            nome e telefone para fazer um pedido em uma loja, tratamos esses dados em nome do
            lojista, que é o controlador. Dúvidas ou pedidos sobre esses dados devem ser
            dirigidos primeiro à própria loja; nós damos suporte ao lojista para atendê-los.
          </li>
        </ul>
      </section>

      <section>
        <h2>2. Quais dados coletamos</h2>
        <h3 className="mt-4">2.1 De lojistas (donos e equipe das lojas)</h3>
        <ul className="mt-3">
          <li>E-mail, senha (armazenada com criptografia bcrypt), nome e papel na equipe;</li>
          <li>WhatsApp, Instagram, endereço e logotipo da loja (exibidos no catálogo público);</li>
          <li>Dados de assinatura do plano (identificadores de cobrança do Stripe);</li>
          <li>Endereço IP e e-mail em registros de segurança (tentativas de login);</li>
          <li>Data e versão do aceite destes documentos legais.</li>
        </ul>
        <p className="mt-3">
          <strong>Não armazenamos dados de cartão de crédito</strong> — pagamentos são
          processados integralmente pelo Stripe.
        </p>

        <h3 className="mt-4">2.2 De clientes finais (quem compra nas lojas)</h3>
        <ul className="mt-3">
          <li>Nome e telefone, informados voluntariamente ao enviar um pedido;</li>
          <li>Itens e valores dos pedidos realizados;</li>
          <li>
            Sacola e favoritos do visitante, guardados por um código aleatório que expira em
            30 dias — sem vínculo com identidade.
          </li>
        </ul>
        <p className="mt-3">
          As métricas de navegação do catálogo (produtos vistos, adições à sacola) são
          registradas <strong>sem nenhum identificador de pessoa</strong> — não gravamos IP nem
          código de sessão nesses eventos.
        </p>

        <h3 className="mt-4">2.3 Dados guardados no seu navegador (localStorage)</h3>
        <p className="mt-3">
          Não usamos cookies de rastreamento nem publicidade. Guardamos no armazenamento local
          do seu navegador apenas o necessário para o funcionamento:
        </p>
        <ul className="mt-3">
          <li>Código aleatório de sessão do visitante (chave da sacola e favoritos);</li>
          <li>
            Nome e telefone informados no pedido, para não pedir de novo — removíveis a
            qualquer momento pelo botão &ldquo;Sair&rdquo; no cabeçalho da loja;
          </li>
          <li>Lista de produtos já vistos (usada só para não duplicar contagens — nunca sai do seu navegador);</li>
          <li>Para lojistas: o token de acesso ao painel administrativo.</li>
        </ul>
      </section>

      <section>
        <h2>3. Para que usamos e com qual base legal</h2>
        <ul className="mt-3">
          <li>
            <strong>Prestar o serviço</strong> (contas, catálogo, pedidos, cobrança) — execução
            de contrato (art. 7º, V da LGPD);
          </li>
          <li>
            <strong>Segurança</strong> (registros de login, limites de requisições por IP) —
            legítimo interesse (art. 7º, IX);
          </li>
          <li>
            <strong>Obrigações fiscais</strong> (registros de cobrança) — obrigação legal
            (art. 7º, II).
          </li>
        </ul>
        <p className="mt-3">
          Não usamos os dados de clientes finais para marketing, nem os compartilhamos entre
          lojas diferentes — cada loja só enxerga os próprios clientes.
        </p>
      </section>

      <section>
        <h2>4. Com quem compartilhamos</h2>
        <p className="mt-3">
          Usamos provedores de infraestrutura (suboperadores) para manter a plataforma
          funcionando. Alguns ficam fora do Brasil, o que configura transferência internacional
          de dados amparada em cláusulas contratuais (arts. 33-36 da LGPD):
        </p>
        <ul className="mt-3">
          <li><strong>Vercel</strong> (EUA) — hospedagem do site e da API;</li>
          <li><strong>Provedor PostgreSQL gerenciado</strong> — banco de dados;</li>
          <li><strong>Upstash</strong> — sacolas, favoritos e contadores de segurança (Redis);</li>
          <li><strong>Resend</strong> (EUA) — envio de e-mails transacionais;</li>
          <li><strong>Cloudflare R2</strong> — armazenamento de imagens de produtos e logotipos;</li>
          <li>
            <strong>Stripe</strong> — processa os pagamentos de assinaturas como
            controlador próprio, sob a política de privacidade dele;
          </li>
          <li>
            <strong>WhatsApp/Meta</strong> — ao confirmar um pedido, a mensagem com nome,
            telefone e itens é enviada pelo WhatsApp, por escolha do próprio cliente.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Por quanto tempo guardamos</h2>
        <ul className="mt-3">
          <li>Dados da conta do lojista: enquanto a conta existir;</li>
          <li>Dados de cobrança: 5 anos após o término (prazo fiscal);</li>
          <li>Tokens de redefinição de senha e verificação de e-mail: eliminados após o uso ou expiração;</li>
          <li>Notificações do painel (que podem conter nome/telefone de clientes): 90 dias;</li>
          <li>
            Nome e telefone em pedidos antigos: anonimizados após 24 meses (os valores
            permanecem apenas para estatística da loja);
          </li>
          <li>Cadastros de clientes sem pedido novo há 24 meses: eliminados;</li>
          <li>Eventos de analytics (já anônimos): 12 meses;</li>
          <li>Registros de segurança (logs): até 6 meses;</li>
          <li>
            Cópias de segurança (backups) do banco de dados podem reter dados excluídos por um
            período adicional limitado, até expirarem automaticamente.
          </li>
        </ul>
        <p className="mt-3">
          Ao excluir a conta da loja, todos os dados dela — produtos, pedidos, clientes,
          imagens e equipe — são apagados em cascata.
        </p>
      </section>

      <section>
        <h2>6. Seus direitos (art. 18 da LGPD)</h2>
        <p className="mt-3">
          Você pode solicitar: confirmação de tratamento, acesso, correção, anonimização,
          portabilidade, eliminação, informação sobre compartilhamentos e revogação de
          consentimento.
        </p>
        <ul className="mt-3">
          <li>
            <strong>Lojistas:</strong> pelo painel administrativo é possível corrigir dados do
            perfil, exportar todos os dados da loja e excluir a conta definitivamente. Para o
            restante, escreva para o e-mail abaixo.
          </li>
          <li>
            <strong>Clientes finais:</strong> fale primeiro com a loja onde fez o pedido (pelo
            WhatsApp dela) — ela é a controladora dos seus dados e tem ferramentas para
            corrigir, exportar e excluir seu cadastro. Se não conseguir retorno, escale para o
            nosso Encarregado.
          </li>
        </ul>
        <p className="mt-3">Respondemos às solicitações em até 15 dias.</p>
      </section>

      <section>
        <h2>7. Segurança</h2>
        <p className="mt-3">
          Adotamos medidas técnicas alinhadas aos arts. 46-49 da LGPD: senhas com hash bcrypt,
          isolamento de dados entre lojas garantido em nível de código, tokens de acesso com
          expiração, limites de requisições contra abuso, validação de todas as entradas e
          mascaramento de erros internos. Em caso de incidente de segurança com risco relevante,
          comunicaremos a ANPD e os titulares afetados nos prazos da regulamentação.
        </p>
      </section>

      <section>
        <h2>8. Crianças e adolescentes</h2>
        <p className="mt-3">
          A plataforma é destinada a maiores de 18 anos (lojistas) e não coleta
          intencionalmente dados de crianças. Não pedimos data de nascimento e coletamos o
          mínimo necessário para o pedido.
        </p>
      </section>

      <section>
        <h2>9. Encarregado de Dados (DPO) e contato</h2>
        <p className="mt-3">
          Para exercer seus direitos ou tirar dúvidas sobre esta política, fale com o nosso
          Encarregado de Proteção de Dados:{' '}
          <a href={`mailto:${EMAIL_PRIVACIDADE}`}>{EMAIL_PRIVACIDADE}</a>
        </p>
      </section>

      <section>
        <h2>10. Alterações desta política</h2>
        <p className="mt-3">
          Podemos atualizar esta política para refletir mudanças no serviço ou na legislação.
          Mudanças relevantes serão comunicadas aos lojistas por e-mail e a versão vigente
          estará sempre nesta página. Veja também os{' '}
          <Link href="/termos">Termos de Uso</Link>.
        </p>
      </section>
    </LegalPageLayout>
  )
}
