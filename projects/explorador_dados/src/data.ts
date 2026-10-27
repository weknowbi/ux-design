/**
 * Visão de exemplo: a mesma que está aberta no dashboard 156 ("Offline"),
 * Vendas por UF da empresa. Os números são os do gráfico de produção.
 */

export const MEASURE = 'Vendas'
export const ROW_FIELD = 'UF empresa'

export const DATA: { label: string; value: number }[] = [
  { label: 'AC', value: 36726 },
  { label: 'AL', value: 32184 },
  { label: 'BA', value: 113163 },
  { label: 'CE', value: 42157 },
  { label: 'MG', value: 61298 },
  { label: 'MT', value: 37253 },
  { label: 'PB', value: 33517 },
  { label: 'PE', value: 126715 },
  { label: 'PI', value: 47003 },
  { label: 'RN', value: 84419 },
  { label: 'RO', value: 74390 },
  { label: 'RS', value: 128286 },
  { label: 'SC', value: 28080 },
  { label: 'SP', value: 122270 },
  { label: 'TO', value: 32539 },
]

export type TreeNode = { label: string; children?: TreeNode[]; open?: boolean }

export const FIELD_TREE: TreeNode[] = [
  {
    label: '(sem hierarquia)',
    open: true,
    children: [{ label: 'Categoria Produto' }, { label: 'DataHoraVenda' }],
  },
  {
    label: 'ItemVenda',
    open: true,
    children: [
      { label: 'Código item venda' },
      { label: 'Embalado' },
      {
        label: 'Produto',
        open: true,
        children: [
          { label: 'CategoriaProduto', open: true, children: [{ label: 'Categoria produto' }] },
          { label: 'Nome produto' },
          { label: 'Preço unitário produto' },
        ],
      },
      { label: 'Quantidade item venda' },
      {
        label: 'Venda',
        open: true,
        children: [
          { label: 'Código venda' },
          {
            label: 'customer',
            open: true,
            children: [
              {
                label: 'Cliente',
                open: true,
                children: [
                  {
                    label: 'Data nascimento cliente',
                    open: true,
                    children: [
                      { label: 'Ano nascimento cliente' },
                      { label: 'Dia nascimento cliente' },
                      { label: 'Mês nascimento cliente' },
                    ],
                  },
                  { label: 'Nome cliente' },
                  { label: 'UF cliente' },
                ],
              },
            ],
          },
          {
            label: 'Data/hora venda',
            children: [{ label: 'Ano venda' }, { label: 'Mês venda' }, { label: 'Dia venda' }],
          },
          {
            label: 'employee',
            children: [{ label: 'Empregado', children: [{ label: 'Nome empregado' }] }],
          },
          {
            label: 'Empresa',
            children: [{ label: 'Nome empresa' }, { label: 'UF empresa' }],
          },
        ],
      },
      { label: 'Vendas' },
    ],
  },
  {
    label: 'Variáveis de contexto',
    children: [
      { label: 'sys:dashboardid' },
      { label: 'sys:ipaddress' },
      { label: 'sys:menuid' },
      { label: 'sys:userdisplayname' },
      { label: 'sys:userid' },
      { label: 'sys:username' },
    ],
  },
]
