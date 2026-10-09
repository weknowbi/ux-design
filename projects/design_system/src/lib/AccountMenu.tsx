import { useRef, useState, type CSSProperties } from 'react'
import { COLOR, FONT } from './tokens'
import { Icon } from './icons'
import { Dropdown, MenuAction } from './Menu'
import { PHOTO_REMOVED, readAvatarFile, setAccountPhoto, useAccountPhoto } from './account'

/**
 * O menu da conta, ancorado na foto da barra de topo.
 *
 * Antes a foto era um botão morto nos dois tamanhos de tela: `title="Conta"`
 * e nada acontecia. Quem usava o portal não tinha onde ler o próprio nome
 * nem como trocar a foto — nem no celular, apesar de a gaveta de lá parecer
 * o lugar natural para isso.
 *
 * A gaveta foi descartada justamente por isso: ela só existe no celular, e
 * resolver perfil lá dentro deixaria a versão de mesa sem resposta. O menu
 * na foto é o contrário — a foto já está no mesmo canto nos dois modos, e o
 * mesmo componente serve os dois sem bifurcar o layout. É o caminho do
 * Google (Drive, Gmail), que é onde este público já aprendeu a procurar.
 *
 * O que ele NÃO repete: Tema, Ajuda e Sair, que já moram no rodapé do menu
 * lateral nos dois modos. Duas portas para o mesmo lugar custam mais do que
 * economizam — principalmente quando uma delas é "Sair".
 */

/** Foto do cabeçalho do menu. Maior que a da barra, e é por ela que se troca. */
const HEADER_PHOTO = 56

/** Sem foto não há o que trocar: o rótulo diz o que a ação faz de verdade. */
const TROCAR = (src: string | null) => (src ? 'Trocar foto' : 'Escolher foto')

/**
 * Enquadramento da foto que vem com a conta (nó 3630:4012): o arquivo é um
 * retrato 256×320 e o desenho mostra dele um recorte com zoom, centrado na
 * horizontal e puxado para cima, onde está o rosto.
 *
 * Vale só para essa foto. A que a pessoa carrega já sai quadrada do recorte
 * de `readAvatarFile`, então ali basta cobrir a caixa.
 */
const ORIGINAL_FRAME: CSSProperties = {
  width: '200%',
  height: '249.91%',
  left: '-50%',
  top: '-11.84%',
}

/**
 * A inicial do nome, para quem está sem foto.
 *
 * O par de cores é o mesmo do item aberto no menu lateral: tingido de marca
 * no fundo, azul de marca na letra. Já existe na tela ao lado, então o
 * círculo entra como parte da interface e não como um selo colorido que
 * disputa atenção com a foto de quem tem uma.
 */
function Initial({ name, size }: { name: string; size: number }) {
  return (
    <span
      aria-hidden
      className="w-full h-full flex items-center justify-center font-semibold select-none"
      style={{
        background: COLOR.tint,
        color: COLOR.primary,
        fontFamily: FONT,
        /* 44% do diâmetro: a letra ocupa o círculo sem encostar na borda, na
           mesma proporção nos três tamanhos em que a cara aparece. */
        fontSize: Math.round(size * 0.44),
        lineHeight: 1,
      }}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  )
}

/** A cara da conta: a foto, quando existe, e a inicial quando não. */
function Face({
  src,
  custom,
  name,
  size,
}: {
  src: string | null
  custom: boolean
  name: string
  size: number
}) {
  if (!src) return <Initial name={name} size={size} />
  return custom ? (
    <img src={src} alt="" className="w-full h-full object-cover" />
  ) : (
    <img src={src} alt="" className="absolute max-w-none" style={ORIGINAL_FRAME} />
  )
}

export function AccountMenu({
  name,
  email,
  photo,
  size = 36,
  align = 'right',
}: {
  name: string
  email: string
  /**
   * A foto que veio com a conta. Entra por fora porque é conteúdo do
   * produto: a biblioteca não carrega a imagem de ninguém.
   */
  photo: string
  /** 36 na barra de mesa (nó 3630:4012), 32 na do celular. */
  size?: number
  align?: 'left' | 'right'
}) {
  /* Três estados, e não dois: escolheu uma foto, tirou a foto, ou não mexeu.
     `src` nulo é o caso sem foto, em que a cara vira a inicial do nome. */
  const escolha = useAccountPhoto()
  const custom = !!escolha && escolha !== PHOTO_REMOVED
  const src = escolha === PHOTO_REMOVED ? null : (escolha ?? photo)
  const fileRef = useRef<HTMLInputElement>(null)
  /**
   * O aviso mora no próprio menu, e não num toast: o toast do portal é um
   * contexto da tela de acervo, e a barra de topo também existe em telas que
   * não o fornecem. Aqui o erro aparece a um palmo do botão que o causou.
   */
  const [error, setError] = useState(false)

  const pick = async (file: File | undefined) => {
    if (!file) return
    try {
      setAccountPhoto(await readAvatarFile(file))
      setError(false)
    } catch {
      setError(true)
    }
  }

  return (
    <div className="relative shrink-0">
      <Dropdown
        align={align}
        minWidth={272}
        onClose={() => setError(false)}
        trigger={({ open, toggle }) => (
          <button
            type="button"
            onClick={toggle}
            title="Conta"
            aria-label="Conta"
            aria-haspopup="menu"
            aria-expanded={open}
            /* `flex` não é enfeite: sem ele o botão é inline, e a imagem dentro
               deixa a descida da linha de base embaixo. O contêiner do gatilho
               media 42 em vez de 36, e a barra, que centraliza pelo que mede,
               subia o avatar 3px. A inicial, que já é flex, não tinha essa
               descida, então as duas caras não paravam no mesmo lugar. */
            className="shrink-0 flex items-center justify-center rounded-full overflow-hidden relative transition-opacity hover:opacity-90 active:opacity-80"
            style={{ width: size, height: size }}
          >
            <Face src={src} custom={custom} name={name} size={size} />
          </button>
        )}
      >
        {(close) => (
          <>
            {/* Quem é você, antes do que dá para fazer. Os 12 de folga aqui
                mais os 4 do painel dão os 16 de respiro da grade. */}
            <div className="flex items-center p-3" style={{ gap: 12 }}>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                title={TROCAR(src)}
                aria-label={TROCAR(src)}
                className="group shrink-0 flex items-center justify-center rounded-full overflow-hidden relative"
                style={{ width: HEADER_PHOTO, height: HEADER_PHOTO }}
              >
                <Face src={src} custom={custom} name={name} size={HEADER_PHOTO} />
                {/* O véu com a câmera é atalho, não a única porta: ele não
                    existe no toque nem para o teclado, e é por isso que
                    "Trocar foto" continua abaixo como linha de menu. */}
                <span
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.45)' }}
                >
                  <Icon name="photo_camera" size={20} color="#fff" />
                </span>
              </button>

              <div className="flex flex-col min-w-0" style={{ fontFamily: FONT }}>
                <span
                  title={name}
                  className="truncate text-[15px] font-semibold leading-[22px]"
                  style={{ color: COLOR.text }}
                >
                  {name}
                </span>
                <span
                  title={email}
                  className="truncate text-[13px] leading-[18px]"
                  style={{ color: COLOR.textSecondary }}
                >
                  {email}
                </span>
              </div>
            </div>

            {/* Sangra até a borda do painel: os 4 de padding dele viram margem
                negativa, senão o fio nasceria recuado dos dois lados e
                pareceria um erro de alinhamento. */}
            <div style={{ height: 1, background: COLOR.border, marginInline: -4, marginBlock: 4 }} />

            <MenuAction icon="photo_camera" label={TROCAR(src)} onSelect={() => fileRef.current?.click()} />
            {/* Vale para a foto escolhida e para a que veio com a conta: as
                duas são foto, e quem tira qualquer uma delas fica com a
                inicial. */}
            {src && (
              <MenuAction
                icon="delete"
                label="Remover foto"
                onSelect={() => {
                  setAccountPhoto(PHOTO_REMOVED)
                  setError(false)
                  close()
                }}
              />
            )}

            {error && (
              <p
                className="text-[13px] leading-[18px] px-2 pb-1 pt-1"
                style={{ fontFamily: FONT, color: COLOR.danger }}
              >
                Não consegui ler essa imagem.
              </p>
            )}
          </>
        )}
      </Dropdown>

      {/* Fora do painel de propósito: o menu some ao fechar, e com o input
          dentro dele o arquivo escolhido chegaria a um elemento já removido. */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0])
          // Zera para que escolher o MESMO arquivo de novo ainda dispare o evento.
          e.target.value = ''
        }}
      />
    </div>
  )
}
