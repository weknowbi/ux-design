import avatar from '@/assets/avatar.jpg'

/**
 * Quem está usando o portal.
 *
 * Nome e e-mail saem da lista de Usuários (Configurações > Usuários e
 * acessos) de propósito: quem abre o menu da conta e depois o cadastro
 * encontra a mesma pessoa nos dois lugares. Um nome inventado aqui faria o
 * protótipo se contradizer na primeira tela que alguém cruzasse.
 *
 * No produto isto vem da sessão; aqui é constante porque não há login.
 */
export const CURRENT_USER = {
  name: 'Carlos Pereira',
  email: 'carlos.pereira@weknow.com.br',
  /** A foto de origem. A que a pessoa trocar fica no navegador (ver `account` da biblioteca). */
  photo: avatar,
}
