import { useRef, useState } from 'react'
import { Btn } from '@ds/Btn'
import { FormField, Select, fieldBoxStyle, fieldTextStyle } from '@ds/Field'
import { Modal, ModalFooter } from '@ds/Modal'
import { Switch } from '@ds/Switch'
import { readImageFile, setAppearance, useAppearance } from '@ds/appearance'
import { COLOR, FONT } from '@/design/tokens'
import { Icon } from '@/components/icons'
import { DashboardSketch } from '@/blocks/DashboardSketch'
import { PORTAL_FOLDERS, sketchOf } from '@/data/created'
import { metadadoOf } from '@/engine/catalog'
import { DIMENSIONS, INDICATORS } from '@/engine/semantic'
import type { Access, Board } from '@/engine/board'
import { publish } from '@/lib/store'

/**
 * Publicar o dashboard no portal.
 *
 * A ordem das perguntas é a de quem publica: onde ele aparece (nome, pasta
 * e a capa do card), depois quem pode ver e o que cada um vê. A segurança
 * vem com o recomendado já marcado (quem acessa a pasta, com as regras do
 * metadado, sem baixar dados), então publicar sem mexer em nada já é
 * publicar certo.
 *
 * Publicado, ele entra na pasta escolhida e quem abre o portal o encontra lá,
 * com a capa. A versão publicada é uma marca: quem edita continua no
 * rascunho, e "Publicar alterações" só move a marca. O link é um só.
 */
const GROUPS = ['Diretoria', 'Faturamento', 'Auditoria de contas', 'Gestão assistencial', 'Controladoria']

const DEFAULT_ACCESS: Access = { who: 'pasta', groups: [], rows: true, export: false }

export function PublishDialog({ board, onClose, onPublished }: { board: Board; onClose: () => void; onPublished: (folder: string) => void }) {
  const md = metadadoOf(board.ind)
  const republish = !!board.saved
  const [name, setName] = useState(board.saved?.name ?? board.title)
  const [folder, setFolder] = useState(
    board.saved?.folder ?? (board.from && PORTAL_FOLDERS.find((f) => f === board.from!.folder)) ?? PORTAL_FOLDERS[0],
  )
  const [access, setAccess] = useState<Access>(board.saved?.access ?? DEFAULT_ACCESS)
  const stored = useAppearance(board.id)?.image ?? undefined
  const [image, setImage] = useState<string | undefined>(stored)
  const [focused, setFocused] = useState(false)
  const [imageError, setImageError] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const cuts = INDICATORS[board.ind].dims.map((d) => DIMENSIONS[d].plural).join(', ').replace(/, ([^,]+)$/, ' e $1')
  const canPublish = !!name.trim() && (access.who !== 'grupos' || access.groups.length > 0)
  const set = (patch: Partial<Access>) => setAccess((a) => ({ ...a, ...patch }))

  const pick = async (file: File | undefined) => {
    if (!file) return
    try {
      setImage(await readImageFile(file))
      setImageError(false)
    } catch {
      setImageError(true)
    }
  }

  return (
    <Modal title={republish ? 'Publicar alterações' : 'Publicar dashboard'} width={560} onClose={onClose}>
      <div className="min-h-0 overflow-y-auto" style={{ paddingInline: 24, fontFamily: FONT }}>
        <p style={{ fontSize: 14, lineHeight: '20px', color: COLOR.textSecondary, margin: '0 0 16px' }}>
          {republish
            ? 'Quem abre o dashboard no portal passa a ver esta versão. O link continua o mesmo.'
            : `O dashboard entra na pasta escolhida e aparece para quem abrir o portal, ligado ao metadado ${md.code} - ${md.name}: os números se atualizam com ele.`}
        </p>

        <FormField label="Nome do dashboard">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={(e) => {
              setFocused(true)
              e.currentTarget.select()
            }}
            onBlur={() => setFocused(false)}
            aria-label="Nome do dashboard"
            className="outline-none"
            style={{ ...fieldBoxStyle({ focused }), ...fieldTextStyle }}
          />
        </FormField>
        <FormField label="Pasta no portal">
          <Select value={folder} onChange={setFolder} options={PORTAL_FOLDERS.map((f) => ({ id: f, label: f }))} ariaLabel="Pasta no portal" />
        </FormField>

        {/* A capa é o card do portal: a mesma proporção 2:1 e o mesmo croqui
            de quando não há imagem, para a pessoa ver o que os outros vão ver. */}
        <FormField label="Capa no portal">
          <div className="flex items-center" style={{ gap: 16 }}>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              title={image ? 'Trocar imagem' : 'Carregar imagem do disco'}
              className="shrink-0 overflow-hidden flex items-center justify-center rounded-lg border border-[var(--wk-border)] transition-shadow hover:shadow-[0_0_0_2px_var(--wk-primary)] outline-none focus-visible:shadow-[0_0_0_2px_var(--wk-primary)]"
              style={{ width: 176, height: 88, background: 'var(--wk-thumb-empty)' }}
            >
              {image ? <img src={image} alt="" className="w-full h-full object-cover" /> : <DashboardSketch layout={sketchOf(board.widgets)} />}
            </button>
            <div className="flex flex-col items-start min-w-0" style={{ gap: 4 }}>
              <span style={{ fontSize: 13, lineHeight: '18px', color: COLOR.textSecondary }}>
                {image ? 'Imagem carregada.' : 'Sem imagem, o card mostra o croqui dos blocos.'}
              </span>
              {imageError && <span style={{ fontSize: 13, lineHeight: '18px', color: 'var(--an-danger-text)' }}>Não consegui ler essa imagem.</span>}
              <div className="flex items-center" style={{ gap: 4, marginLeft: -12 }}>
                <Btn variant="ghost" size="sm" iconLeft="upload" onClick={() => fileRef.current?.click()}>
                  {image ? 'Trocar imagem' : 'Carregar do disco'}
                </Btn>
                {image && (
                  <Btn variant="ghost" size="sm" onClick={() => setImage(undefined)}>
                    Usar o croqui
                  </Btn>
                )}
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                pick(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </div>
        </FormField>

        <div style={{ height: 1, background: COLOR.border, margin: '8px 0 20px' }} />

        <h3 className="flex items-center" style={{ gap: 6, fontSize: 16, lineHeight: '24px', fontWeight: 600, color: COLOR.text, margin: '0 0 4px' }}>
          <Icon name="shield_lock" size={20} color={COLOR.navLabel} />
          Segurança
        </h3>
        <p style={{ fontSize: 13, lineHeight: '18px', color: COLOR.textSecondary, margin: '0 0 12px' }}>Já vem no recomendado: quem acessa a pasta, cada um vendo só o que pode, sem baixar dados.</p>

        <div role="radiogroup" aria-label="Quem pode ver" className="flex flex-col" style={{ gap: 4 }}>
          <span style={{ fontSize: 14, lineHeight: '20px', fontWeight: 500, color: COLOR.text, marginBottom: 4 }}>Quem pode ver</span>
          <Radio checked={access.who === 'pasta'} onSelect={() => set({ who: 'pasta' })} label="Quem já acessa a pasta" hint="Segue as permissões da pasta escolhida." />
          <Radio checked={access.who === 'grupos'} onSelect={() => set({ who: 'grupos' })} label="Só alguns grupos" hint="Dentro da pasta, só quem está nos grupos marcados." />
          {access.who === 'grupos' && (
            <div className="flex flex-wrap wk-enter" style={{ gap: 6, padding: '4px 0 8px 32px' }}>
              {GROUPS.map((g) => {
                const on = access.groups.includes(g)
                return (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set({ groups: on ? access.groups.filter((x) => x !== g) : [...access.groups, g] })}
                    className="inline-flex items-center rounded-full transition-colors hover:bg-[var(--wk-list-hover)]"
                    style={{
                      height: 32,
                      gap: 4,
                      padding: on ? '0 12px 0 8px' : '0 12px',
                      fontSize: 14,
                      border: `1px solid ${on ? 'transparent' : COLOR.border}`,
                      background: on ? 'var(--wk-chip-active-bg)' : undefined,
                      color: on ? 'var(--wk-chip-active-text)' : COLOR.text,
                    }}
                  >
                    {on && <Icon name="check" size={18} color="currentColor" />}
                    {g}
                  </button>
                )
              })}
              {!access.groups.length && <span style={{ fontSize: 13, lineHeight: '32px', color: COLOR.textSecondary }}>Marque ao menos um grupo.</span>}
            </div>
          )}
          <Radio checked={access.who === 'eu'} onSelect={() => set({ who: 'eu' })} label="Só eu" hint="Fica na pasta, mas só você vê. Bom para conferir antes de abrir." />
        </div>

        <div className="flex flex-col" style={{ marginTop: 16 }}>
          <SwitchRow
            checked={access.rows}
            onChange={(rows) => set({ rows })}
            label={`Aplicar as regras de acesso do metadado ${md.code}`}
            hint={`Cada pessoa vê só os ${cuts} liberados para ela. Desligado, todos veem tudo o que o dashboard mostra.`}
          />
          <SwitchRow checked={access.export} onChange={(v) => set({ export: v })} label="Permitir baixar os dados" hint="Exportar a tabela de cada gráfico em planilha." />
        </div>

        <p className="flex items-start" style={{ gap: 8, fontSize: 13, lineHeight: '18px', color: COLOR.textSecondary, margin: '12px 0 8px', padding: '10px 12px', borderRadius: 8, background: 'var(--wk-surface-subtle)' }}>
          <Icon name="lock" size={16} color={COLOR.navLabel} className="shrink-0 mt-px" />
          O Criar com IA lê só os agregados do metadado. Nenhum dado de paciente passa pela IA nem aparece no portal.
        </p>
      </div>
      <ModalFooter>
        <Btn variant="ghost" onClick={onClose}>
          Cancelar
        </Btn>
        <Btn
          variant="primary"
          disabled={!canPublish}
          onClick={() => {
            setAppearance(board.id, image ? { image } : stored ? { image: null } : null)
            publish(board.id, name.trim(), folder, access)
            onPublished(folder)
          }}
        >
          {republish ? 'Publicar alterações' : 'Publicar'}
        </Btn>
      </ModalFooter>
    </Modal>
  )
}

export function Radio({ checked, onSelect, label, hint }: { checked: boolean; onSelect: () => void; label: string; hint: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className="flex items-start text-left rounded-lg transition-colors hover:bg-[var(--wk-list-hover)] outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--wk-primary)]"
      style={{ gap: 12, padding: '8px 8px', margin: '0 -8px' }}
    >
      <span
        className="shrink-0 flex items-center justify-center rounded-full"
        style={{ width: 20, height: 20, marginTop: 1, border: `2px solid ${checked ? COLOR.primary : COLOR.borderStrong}` }}
      >
        {checked && <span className="rounded-full" style={{ width: 10, height: 10, background: COLOR.primary }} />}
      </span>
      <span className="flex flex-col" style={{ gap: 2 }}>
        <span style={{ fontSize: 14, lineHeight: '20px', color: COLOR.text }}>{label}</span>
        <span style={{ fontSize: 13, lineHeight: '18px', color: COLOR.textSecondary }}>{hint}</span>
      </span>
    </button>
  )
}

function SwitchRow({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <div className="flex items-start" style={{ gap: 16, padding: '8px 0' }}>
      <span className="flex-1 flex flex-col" style={{ gap: 2 }}>
        <span style={{ fontSize: 14, lineHeight: '20px', color: COLOR.text }}>{label}</span>
        <span style={{ fontSize: 13, lineHeight: '18px', color: COLOR.textSecondary }}>{hint}</span>
      </span>
      <span style={{ paddingTop: 1 }}>
        <Switch checked={checked} onChange={onChange} label={label} />
      </span>
    </div>
  )
}
