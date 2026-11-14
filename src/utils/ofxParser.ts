export function parseOFX(conteudo: string) {
  const transacoes: {
    tipo: 'debito' | 'credito'
    valor: number
    descricao: string
    data_movimentacao: string
    identificador_externo: string
    origem: 'ofx'
    status_conciliacao: 'pendente'
  }[] = []

  // Remove headers e pega só o XML
  const xmlMatch = conteudo.match(/<OFX>[\s\S]*<\/OFX>/)
  const texto = xmlMatch ? xmlMatch[0] : conteudo

  // Extrai transações
  const regexTrn = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g
  let match

  while ((match = regexTrn.exec(texto)) !== null) {
    const trn = match[1]

    const getValue = (tag: string) => {
      const m = trn.match(new RegExp(`<${tag}>([^<]+)`))
      return m ? m[1].trim() : ''
    }

    const tipo = getValue('TRNTYPE')
    const valor = parseFloat(getValue('TRNAMT') || '0')
    const dataStr = getValue('DTPOSTED')

    // Converte data OFX (YYYYMMDD) para Date
    const data = dataStr ? new Date(
      parseInt(dataStr.slice(0, 4)),
      parseInt(dataStr.slice(4, 6)) - 1,
      parseInt(dataStr.slice(6, 8))
    ) : new Date()

    transacoes.push({
      tipo: valor < 0 || tipo === 'DEBIT' ? 'debito' : 'credito',
      valor: Math.abs(valor),
      descricao: getValue('MEMO') || getValue('NAME'),
      data_movimentacao: data.toISOString().split('T')[0],
      identificador_externo: getValue('FITID'),
      origem: 'ofx' as const,
      status_conciliacao: 'pendente' as const,
    })
  }

  // Tenta também formato não-XML (SGML)
  if (transacoes.length === 0) {
    const linhas = conteudo.split('\n')
    let trnAtual: any = {}

    for (const linha of linhas) {
      const [tag, valor] = linha.split(':')
      if (!tag || !valor) continue

      const t = tag.trim()
      const v = valor.trim()

      if (t === '<TRNTYPE') trnAtual.trntype = v
      if (t === '<DTPOSTED') trnAtual.dtposted = v
      if (t === '<TRNAMT') trnAtual.trnamt = v
      if (t === '<FITID') trnAtual.fitid = v
      if (t === '<MEMO') trnAtual.memo = v
      if (t === '</STMTTRN') {
        if (trnAtual.trnamt) {
          const val = parseFloat(trnAtual.trnamt)
          const ds = trnAtual.dtposted || ''
          transacoes.push({
            tipo: val < 0 ? 'debito' : 'credito',
            valor: Math.abs(val),
            descricao: trnAtual.memo || '',
            data_movimentacao: ds
              ? `${ds.slice(0, 4)}-${ds.slice(4, 6)}-${ds.slice(6, 8)}`
              : new Date().toISOString().split('T')[0],
            identificador_externo: trnAtual.fitid,
            origem: 'ofx' as const,
            status_conciliacao: 'pendente' as const,
          })
        }
        trnAtual = {}
      }
    }
  }

  return transacoes
}
