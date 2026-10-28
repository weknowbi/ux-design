import { COLOR, FONT } from '@/design/tokens'
import { Icon } from '@/components/icons'

/**
 * "Nova pasta": o primeiro dos controles da folha, antes da ordem e da
 * visualização, na home e dentro de pasta, no mesmo lugar.
 *
 * Mesma voz dos vizinhos (texto apagado, sem caixa até o hover): é a linha de
 * ferramentas da folha, e um botão cheio ali mandaria mais que as pastas
 * embaixo dele. O que o separa da ordenação é o rótulo, que é verbo de criar,
 * e o respiro de 8 até o "↑".
 *
 * No celular fica só o ícone, em 28 como o "↑" ao lado: a linha divide
 * espaço com o nome da pasta, e o `create_new_folder` já diz o que faz.
 */
export function NewFolderButton({ mobile = false, onClick }: { mobile?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Nova pasta"
      title="Nova pasta"
      className={`wk-icon-btn flex items-center gap-1 mr-2 ${mobile ? 'justify-center size-7' : 'h-[28px] pl-1 pr-1.5'}`}
    >
      <Icon name="create_new_folder" size={20} color={COLOR.navLabel} />
      {!mobile && (
        <span className="text-[14px] leading-[20px]" style={{ fontFamily: FONT, color: 'var(--wk-control-label)' }}>
          Nova pasta
        </span>
      )}
    </button>
  )
}
