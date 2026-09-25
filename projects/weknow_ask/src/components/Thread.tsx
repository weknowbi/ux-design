import { COLOR, FONT, LAYOUT } from '@/design/tokens'
import { Btn } from '@/components/Btn'
import { FadeScroll } from '@/components/FadeScroll'
import { FilterChipTag } from '@/components/FilterChipTag'
import { Table, type Column } from '@/components/Table'
import type { Block, Message, TableBlock } from '@/data/conversation'

/** `**negrito**` → <strong>, mantendo o resto como texto. */
function rich(text: string) {
  return { __html: text.replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:600">$1</strong>') }
}

function DataTable({ block }: { block: TableBlock }) {
  const columns: Column<string[]>[] = block.columns.map((header, j) => ({
    key: String(j),
    header,
    render: (row) => row[j],
  }))

  return (
    <div className="my-4">
      <Table columns={columns} rows={block.rows} rowKey={(_, i) => String(i)} />
    </div>
  )
}

function BlockView({
  block,
  onSuggest,
  showSuggestions = true,
}: {
  block: Block
  onSuggest?: (text: string) => void
  /** Só a última resposta oferece caminhos — evita acumular no histórico. */
  showSuggestions?: boolean
}) {
  switch (block.kind) {
    case 'paragraph':
      return (
        <p
          className="text-[14px] leading-[1.8] mb-3"
          style={{ fontFamily: FONT, color: COLOR.text }}
          dangerouslySetInnerHTML={rich(block.text)}
        />
      )
    case 'heading':
      return (
        <h3
          className="text-[16px] font-semibold mt-6 mb-2"
          style={{ fontFamily: FONT, color: COLOR.text }}
        >
          {block.text}
        </h3>
      )
    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul'
      return (
        <Tag
          className={`mb-3 pl-5 ${block.ordered ? 'list-decimal' : 'list-disc'}`}
          style={{ fontFamily: FONT, color: COLOR.text }}
        >
          {block.items.map((item, i) => (
            <li key={i} className="text-[14px] leading-[1.8] mb-1" dangerouslySetInnerHTML={rich(item)} />
          ))}
        </Tag>
      )
    }
    case 'suggestions':
      /* A IA sempre oferece três caminhos, mas só na resposta mais recente. */
      if (!showSuggestions) return null
      return (
        <div className="flex flex-col items-start gap-2 mt-4 mb-2">
          {block.items.map((item) => (
            <Btn key={item} variant="secondary" size="sm" onClick={() => onSuggest?.(item)}>
              {item}
            </Btn>
          ))}
        </div>
      )
    case 'table':
      return <DataTable block={block} />
  }
}

function UserMessage({ msg }: { msg: Extract<Message, { role: 'user' }> }) {
  return (
    <div className="flex justify-end wk-enter">
      <div className="max-w-[76%] flex flex-col items-end gap-1.5">
        <div
          className="rounded-2xl rounded-br-sm px-4 py-2.5"
          style={{ background: COLOR.userBubble, color: COLOR.text }}
        >
          <p className="text-[13.5px] leading-relaxed" style={{ fontFamily: FONT }}>
            {msg.text}
          </p>
        </div>
        {msg.filters && msg.filters.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2">
            {msg.filters.map((f) => (
              <FilterChipTag key={f.id} chip={f} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AiMessage({
  msg,
  onSuggest,
  showSuggestions,
}: {
  msg: Extract<Message, { role: 'ai' }>
  onSuggest?: (text: string) => void
  showSuggestions?: boolean
}) {
  return (
    <div className="wk-enter">
      <div className="min-w-0">
        {msg.blocks.map((b, i) => (
          <BlockView key={i} block={b} onSuggest={onSuggest} showSuggestions={showSuggestions} />
        ))}
      </div>
    </div>
  )
}

export function Thread({
  messages,
  loading,
  bottomRef,
  onSuggest,
}: {
  messages: Message[]
  loading: boolean
  bottomRef: React.RefObject<HTMLDivElement | null>
  onSuggest?: (text: string) => void
}) {
  // Índice da resposta mais recente da IA — a única que ainda oferece caminhos.
  let lastAi = -1
  messages.forEach((m, i) => {
    if (m.role === 'ai') lastAi = i
  })

  return (
    <FadeScroll className="flex-1 overflow-y-auto px-6 pt-2 pb-6">
      <div className="mx-auto flex flex-col gap-7" style={{ maxWidth: LAYOUT.threadMaxWidth }}>
        {messages.map((msg, i) =>
          msg.role === 'user' ? (
            <UserMessage key={msg.id} msg={msg} />
          ) : (
            <AiMessage
              key={msg.id}
              msg={msg}
              onSuggest={onSuggest}
              showSuggestions={i === lastAi && !loading}
            />
          ),
        )}

        {loading && (
          <div className="flex gap-3 items-center">
            <div className="rounded-2xl rounded-bl-sm px-4 py-3" style={{ background: COLOR.hoverStrong }}>
              <div className="flex gap-1">
                {[0, 1, 2].map((d) => (
                  <div
                    key={d}
                    className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ background: COLOR.textIcon, animationDelay: `${d * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </FadeScroll>
  )
}
