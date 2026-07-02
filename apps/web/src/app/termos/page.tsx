// Termos de Uso da plataforma — inclui o capítulo de tratamento de dados (DPA)
// entre a plataforma (operadora) e o lojista (controlador), exigido pela LGPD
import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPageLayout } from '@/modules/legal/components/LegalPageLayout'
import { VERSAO_TERMOS, DATA_VIGENCIA_TERMOS, EMAIL_PRIVACIDADE } from '@/modules/legal/constants'

export const metadata: Metadata = {
  title: 'Termos de Uso — Esqueleton',
  description: 'Condições de uso da plataforma Esqueleton e acordo de tratamento de dados.',
}

export default function TermosPage() {
  return (
    <LegalPageLayout
      title="Termos de Uso"
      subtitle={`Versão ${VERSAO_TERMOS} — vigente a partir de ${DATA_VIGENCIA_TERMOS}`}
    >
      <section>
        <h2>1. O serviço</h2>
        <p className="mt-3">
          O Esqueleton oferece a criação de catálogos online (vitrines) para lojas, com
          recebimento de pedidos via WhatsApp, painel administrativo, promoções, cupons e
          relatórios. A plataforma não intermedeia pagamentos entre a loja e os clientes dela —
          a negociação e o pagamento do pedido acontecem diretamente entre as partes.
        </p>
      </section>

      <section>
        <h2>2. Cadastro e conta</h2>
        <ul className="mt-3">
          <li>Para criar uma loja você deve ter 18 anos ou mais e fornecer informações verdadeiras;</li>
          <li>Você é responsável por manter a senha em sigilo e por toda atividade na sua conta;</li>
          <li>
            O aceite destes Termos e da{' '}
            <Link href="/privacidade">Política de Privacidade</Link> é obrigatório no cadastro —
            a data e a versão aceitas ficam registradas;
          </li>
          <li>Contas de equipe (membros convidados) estão sujeitas a estes mesmos Termos.</li>
        </ul>
      </section>

      <section>
        <h2>3. Responsabilidades do lojista</h2>
        <ul className="mt-3">
          <li>Publicar apenas produtos e conteúdos lícitos, dos quais tenha direito de venda e divulgação;</li>
          <li>Manter preços, descrições e informações de contato corretos;</li>
          <li>Atender os pedidos e as solicitações dos próprios clientes, inclusive as relativas a dados pessoais (ver capítulo 5);</li>
          <li>Não usar a plataforma para spam, fraude ou qualquer atividade ilegal.</li>
        </ul>
      </section>

      <section>
        <h2>4. Planos, cobrança e disponibilidade</h2>
        <ul className="mt-3">
          <li>Novas lojas têm um período de teste gratuito; após o período, a publicação do catálogo exige assinatura ativa;</li>
          <li>As assinaturas são cobradas de forma recorrente pelo MercadoPago e podem ser canceladas a qualquer momento pelo painel;</li>
          <li>O painel administrativo permanece acessível mesmo com o catálogo indisponível;</li>
          <li>Empregamos esforços razoáveis de disponibilidade, sem garantia de operação ininterrupta.</li>
        </ul>
      </section>

      <section>
        <h2>5. Tratamento de dados pessoais (acordo operadora–controlador)</h2>
        <p className="mt-3">
          Este capítulo funciona como o acordo de tratamento de dados (DPA) entre a plataforma
          e o lojista, nos termos da LGPD:
        </p>
        <ul className="mt-3">
          <li>
            <strong>Papéis:</strong> para os dados dos clientes finais da loja (nome, telefone,
            pedidos), o <strong>lojista é o controlador</strong> e a{' '}
            <strong>plataforma é a operadora</strong>. A plataforma trata esses dados somente
            para prestar o serviço descrito nestes Termos e conforme as instruções do lojista
            dadas pelo uso do painel;
          </li>
          <li>
            <strong>Suboperadores autorizados:</strong> o lojista autoriza o uso dos provedores
            listados na <Link href="/privacidade">Política de Privacidade</Link> (hospedagem,
            banco de dados, e-mail, imagens, Redis e pagamento). Alterações relevantes nessa
            lista serão comunicadas;
          </li>
          <li>
            <strong>Segurança:</strong> a plataforma mantém as medidas técnicas descritas na
            Política de Privacidade e comunica ao lojista incidentes de segurança que afetem os
            dados dos clientes dele;
          </li>
          <li>
            <strong>Auxílio ao art. 18:</strong> o painel oferece ferramentas para o lojista
            atender os direitos dos clientes dele — buscar, corrigir, exportar e excluir
            cadastros, com opção de anonimizar os pedidos correspondentes;
          </li>
          <li>
            <strong>Marketing:</strong> a base de clientes coletada nos pedidos não deve ser
            usada para disparo de marketing sem base legal própria do lojista (ex.:
            consentimento). A plataforma não fornece ferramentas de disparo em massa;
          </li>
          <li>
            <strong>Encerramento:</strong> ao excluir a conta, todos os dados da loja —
            inclusive os dados dos clientes finais — são eliminados definitivamente, salvo
            retenções exigidas por lei. O lojista pode exportar os dados antes da exclusão.
          </li>
        </ul>
      </section>

      <section>
        <h2>6. Propriedade intelectual</h2>
        <p className="mt-3">
          A plataforma, sua marca e seu código pertencem ao Esqueleton. O conteúdo publicado
          pela loja (fotos, textos, logotipo) pertence ao lojista, que concede à plataforma a
          licença necessária apenas para exibi-lo no catálogo.
        </p>
      </section>

      <section>
        <h2>7. Encerramento e suspensão</h2>
        <ul className="mt-3">
          <li>O lojista pode excluir a conta a qualquer momento pelo painel (Perfil → Excluir loja);</li>
          <li>
            A plataforma pode suspender lojas que violem estes Termos ou a lei, mediante aviso
            quando possível;
          </li>
          <li>
            Lojas suspensas ou canceladas há muito tempo podem ter os dados eliminados após
            notificação prévia por e-mail, conforme a política de retenção.
          </li>
        </ul>
      </section>

      <section>
        <h2>8. Limitação de responsabilidade</h2>
        <p className="mt-3">
          A plataforma fornece a vitrine e as ferramentas de gestão; não é parte nas vendas
          realizadas entre a loja e os clientes dela e não se responsabiliza por qualidade,
          entrega ou pagamento dos produtos anunciados.
        </p>
      </section>

      <section>
        <h2>9. Alterações e contato</h2>
        <p className="mt-3">
          Podemos atualizar estes Termos; mudanças relevantes serão comunicadas por e-mail com
          antecedência razoável. Dúvidas e solicitações:{' '}
          <a href={`mailto:${EMAIL_PRIVACIDADE}`}>{EMAIL_PRIVACIDADE}</a>.
        </p>
      </section>
    </LegalPageLayout>
  )
}
