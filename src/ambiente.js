// Ambiente do build: o site principal (main) ou a homologação (develop, em /homologacao/).
// O build com HOMOLOGACAO=1 (vite.config.js) liga __HOMOLOGACAO__; nele o progresso fica
// em outro prefixo do localStorage e os certificados apontam para /homologacao/.
const ENDERECO = 'https://sertaoseracloud.github.io/kubernetes-playground/';
const PRINCIPAL = { homologacao: false, prefixo: 'kubernetes-playground:', site: ENDERECO };
const TESTE = { homologacao: true, prefixo: 'kubernetes-playground-homologacao:', site: `${ENDERECO}homologacao/` };

/** O ambiente de cada modo (função pura, para os testes). */
export const configurarAmbiente = (homologacao) => ({ ...(homologacao ? TESTE : PRINCIPAL) });

export const HOMOLOGACAO = typeof __HOMOLOGACAO__ !== 'undefined' && __HOMOLOGACAO__ === true;
export const PREFIXO_ARMAZENAMENTO = HOMOLOGACAO ? TESTE.prefixo : PRINCIPAL.prefixo;
export const SITE_ATUAL = HOMOLOGACAO ? TESTE.site : PRINCIPAL.site;