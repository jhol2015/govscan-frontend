export interface Diario {
  id:            number
  portal:        string
  municipio:     string
  edicao:        string
  data_edicao:   string
  tipo:          string
  paginas:       number | null
  status:        string
  erro:          string | null
  url:           string
  nome_arquivo:  string
  criado_em:     string
  atualizado_em: string
}

export interface DiarioListResponse {
  total: number
  items: Diario[]
}

export interface SincronizarResponse {
  portal: string
  ano:    number
  salvos: number
  erros:  number
}
