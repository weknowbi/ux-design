import { useSyncExternalStore } from 'react'

/**
 * A foto que a pessoa escolheu para a própria conta.
 *
 * Fica no navegador (localStorage), ao lado da aparência das pastas e pelo
 * mesmo motivo: no produto isto é campo de cadastro, gravado pelo servidor.
 * Aqui é o que faz o protótipo responder de verdade quando alguém troca a
 * foto — inclusive depois de recarregar a página, que é onde um protótipo
 * costuma entregar que era só desenho.
 *
 * Uma foto só: não há troca de usuário no protótipo, então a chave não
 * precisa de dono.
 */
/**
 * Tirou a foto e ficou com a inicial do nome. É um estado próprio, e não a
 * ausência de valor: sem ele, remover a foto devolveria a que veio com a
 * conta, que é justamente a que a pessoa acabou de dispensar.
 */
export const PHOTO_REMOVED = 'removida'

const KEY = 'wk-account-photo'

let photo: string | null = read()
const listeners = new Set<() => void>()

function read(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/**
 * A foto que a pessoa escolheu, `PHOTO_REMOVED` quando ela tirou a foto, e
 * `null` quando não mexeu em nada e vale a que veio com a conta.
 *
 * Os três estados são diferentes para quem desenha a cara da conta: a foto de
 * origem tem enquadramento próprio, a escolhida já vem quadrada, e sem foto
 * aparece a inicial do nome.
 */
export function useAccountPhoto(): string | null {
  return useSyncExternalStore(subscribe, () => photo)
}

/**
 * Guarda a escolha. `PHOTO_REMOVED` tira a foto e deixa a inicial; `null`
 * esquece a escolha e devolve a foto que veio com a conta, que é o começo do
 * zero e não tem botão no menu.
 */
export function setAccountPhoto(next: string | null) {
  photo = next
  try {
    if (next) localStorage.setItem(KEY, next)
    else localStorage.removeItem(KEY)
  } catch {
    // sem armazenamento (ou imagem grande demais), a troca vale só nesta visita
  }
  listeners.forEach((fn) => fn())
}

/**
 * O maior tamanho em que a foto aparece é 56px no cabeçalho do menu. Guardar
 * 192 dá margem para tela retina (3x) e ainda cabe em ~20KB de JPEG — a foto
 * passa pelo localStorage, que é pequeno e já divide espaço com as capas das
 * pastas.
 */
export const AVATAR_SIZE = 192

/**
 * Lê a imagem do disco já redonda-ável: recorta o quadrado do meio e reduz.
 *
 * O recorte é feito aqui, e não no CSS, porque foto de perfil é quadrada em
 * todo lugar onde aparece — guardar os 4000×3000 do celular para mostrar 56
 * é megabyte à toa, e `object-cover` resolveria só a exibição. Começa pelo
 * centro porque é onde o rosto está em praticamente toda foto de retrato.
 */
export function readAvatarFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const side = Math.min(img.naturalWidth, img.naturalHeight)
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = Math.min(side, AVATAR_SIZE)
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('sem canvas'))
      ctx.drawImage(
        img,
        (img.naturalWidth - side) / 2,
        (img.naturalHeight - side) / 2,
        side,
        side,
        0,
        0,
        canvas.width,
        canvas.height,
      )
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('imagem inválida'))
    }
    img.src = url
  })
}
