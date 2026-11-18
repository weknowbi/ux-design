import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/icons'
import { FONT } from '@/design/tokens'
import { go, parseRoute } from '@/lib/router'

/**
 * Cola de demonstração: os pedidos que o protótipo entende, para quem conduz
 * um teste ou uma apresentação. Fica escondida no canto de baixo à direita e
 * só aparece com o mouse em cima (ou com o Tab), para não entrar no que o
 * usuário do teste vê.
 *
 * Clicar num pedido o põe na caixa da conversa, pronto para o Enter: no Weknow
 * IA, de qualquer tela (abre uma conversa nova); no "Criar com IA", quando o
 * editor está aberto com a conversa. Fora disso, copia.
 *
 * Não é parte do produto: sai junto com as regras que simulam a IA.
 */

type Where = 'ia' | 'editor'
type Group = { title: string; where: Where; items: { text: string; note?: string }[] }

const GROUPS: Group[] = [
  {
    title: 'Weknow Ask · perguntas que viram resposta',
    where: 'ia',
    items: [
      { text: 'Por que a permanência média subiu em outubro?' },
      { text: 'Qual convênio mais glosou em outubro?' },
      { text: 'Os setores com permanência maior também glosam mais?', note: 'cruza o 21 e o 32' },
      { text: 'Me faz um resumo das internações de outubro' },
      { text: 'O que é taxa de glosa e como se calcula?' },
      { text: 'Por que o MAPA da ANS não aparece?', note: 'metadado com falha' },
      { text: 'Quais dashboards usam o 32 - Faturamento e glosas?' },
    ],
  },
  {
    title: 'Weknow Ask · criar dashboard',
    where: 'ia',
    items: [
      { text: 'Quero um dashboard sobre custos de taxa de glosa' },
      { text: 'usa o 21', note: 'depois de criar um: refaz com outro metadado' },
      { text: 'Quero um dashboard de permanência e glosas', note: 'dois assuntos: oferece o outro ou cruzar' },
      { text: 'Quero um dashboard de cancelamentos de cirurgias', note: 'metadado sem dados' },
    ],
  },
  {
    title: 'Weknow Ask · alertas',
    where: 'ia',
    items: [
      { text: 'Me avisa no WhatsApp quando a glosa da Bradesco Saúde passar de 5%, e avisa também o pessoal do faturamento', note: 'já passou: avisa amanhã' },
      { text: 'Me avisa no WhatsApp quando a glosa da Bradesco Saúde passar de 8%', note: 'ainda não passou' },
      { text: 'Me avisa no WhatsApp quando a permanência média da Clínica médica passar de 7 dias, e avisa a diretoria', note: 'pede confirmação' },
      { text: 'Manda um teste do alerta para mim', note: 'depois de criar um' },
      { text: 'Cria um alerta de glosa', note: 'pergunta o limite' },
    ],
  },
  {
    title: 'Weknow Ask · análise de dashboard',
    where: 'ia',
    items: [
      { text: 'Faz uma análise do dashboard Tempo de espera no PS', note: 'acha o dashboard e registra o momento' },
      { text: 'Faz uma análise do dashboard', note: 'pergunta qual' },
      { text: 'Como ficou o infantil?', note: 'numa conversa de análise' },
      { text: 'Qual foi o horário de pico?', note: 'numa conversa de análise' },
      { text: 'Gera outra análise', note: 'numa conversa de análise' },
    ],
  },
  {
    title: 'Weknow Ask · cadastros e telas',
    where: 'ia',
    items: [
      { text: 'Me mostra todos os usuários' },
      { text: 'Quais usuários estão inativos?' },
      { text: 'Quem é administrador?' },
      { text: 'Desativar o acesso da Fernanda', note: 'pede confirmação' },
      { text: 'Reativar o Bruno', note: 'pede confirmação' },
      { text: 'Tornar a Camila administradora', note: 'pede confirmação' },
      { text: 'Mudar a validade da Helena para 31/12/2026', note: 'pede confirmação' },
      { text: 'Onde mudo as permissões?' },
      { text: 'O que você faz?' },
    ],
  },
  {
    title: 'Dashboard · Criar com IA · dados',
    where: 'editor',
    items: [
      { text: 'Últimos 6 meses' },
      { text: 'Só Bradesco Saúde' },
      { text: 'Destacar materiais' },
      { text: 'Todos os convênios' },
      { text: 'Limpa os filtros' },
    ],
  },
  {
    title: 'Dashboard · Criar com IA · visual',
    where: 'editor',
    items: [
      {
        text: 'Quero mudar bastante o visual deste painel: um estilo editorial, de relatório de revista. Fundo creme, títulos e números grandes com serifa, sem cartões em volta dos gráficos, só fios finos separando as seções, e uma única cor de destaque, terracota.',
        note: 'estilo editorial',
      },
      { text: 'Tema escuro' },
      { text: 'Cores em verde' },
      { text: 'Cor principal #0F766E' },
      { text: 'Densidade compacta' },
      { text: 'Cantos retos' },
      { text: 'Linhas retas' },
      { text: 'Esconde a tabela e as notas de método' },
      { text: 'Mostra todas as seções' },
      { text: 'Volta ao visual padrão' },
      { text: 'Trocar pelos blocos', note: 'sai do painel executivo' },
    ],
  },
]

/** Escreve na caixa da conversa como se fosse digitado: o React só vê o valor pelo evento. */
function fill(text: string) {
  const box = [...document.querySelectorAll('textarea')].pop()
  if (!box) return false
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(box, text)
  box.dispatchEvent(new Event('input', { bubbles: true }))
  box.focus()
  box.setSelectionRange(text.length, text.length)
  return true
}

export function DemoPrompts() {
  const [open, setOpen] = useState(false)
  const [flash, setFlash] = useState<{ text: string; msg: string } | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      button.current?.focus()
    }
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const use = async (g: Group, text: string) => {
    /* Lido na hora, e não com `useRoute`: o roteador avisa só o primeiro que
       escuta a troca de tela, e com dois ouvintes o App deixava de trocar. */
    const route = parseRoute(window.location.hash)
    if (g.where === 'ia') {
      /* Vindo de outra tela, a caixa só existe depois que o Weknow IA monta; e
         a espera evita escrever na caixa da tela que está saindo (o editor). */
      const tryFill = (left: number) => {
        if (fill(text)) setOpen(false)
        else if (left) setTimeout(() => tryFill(left - 1), 50)
      }
      if (route.name === 'ia') tryFill(0)
      else {
        go('/ia')
        setTimeout(() => tryFill(40), 100)
      }
      return
    }
    if (route.name === 'dashboard' && fill(text)) {
      setOpen(false)
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      setFlash({ text, msg: route.name === 'dashboard' ? 'Copiado. Abra o Criar com IA e cole' : 'Copiado. Cole no Criar com IA de um dashboard' })
    } catch {
      setFlash({ text, msg: 'Não deu para copiar. Abra um dashboard no editor' })
    }
  }

  return (
    <div ref={root} className="wk-demo" data-open={open || undefined} style={{ fontFamily: FONT }}>
      {open && (
        <div role="dialog" aria-label="Prompts de teste" className="wk-demo-panel">
          <div className="wk-demo-head">
            <div>
              <div className="wk-demo-title">Prompts de teste</div>
              <div className="wk-demo-sub">Clique para pôr na conversa e dê Enter.</div>
            </div>
            <button type="button" className="wk-demo-close" aria-label="Fechar" onClick={() => setOpen(false)}>
              <Icon name="close" size={18} />
            </button>
          </div>
          <div className="wk-demo-body wk-hover-scroll">
            {GROUPS.map((g) => (
              <section key={g.title}>
                <h3 className="wk-demo-group">{g.title}</h3>
                <ul>
                  {g.items.map((it) => (
                    <li key={it.text}>
                      <button type="button" className="wk-demo-item" onClick={() => void use(g, it.text)}>
                        <span className="wk-demo-text">{it.text}</span>
                        {flash?.text === it.text ? (
                          <span className="wk-demo-note" role="status">{flash.msg}</span>
                        ) : (
                          it.note && <span className="wk-demo-note">{it.note}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}
      <button
        ref={button}
        type="button"
        className="wk-demo-trigger"
        aria-label="Prompts de teste"
        aria-expanded={open}
        onClick={() => {
          setFlash(null)
          setOpen((v) => !v)
        }}
      >
        <Icon name="science" size={18} />
      </button>
    </div>
  )
}
