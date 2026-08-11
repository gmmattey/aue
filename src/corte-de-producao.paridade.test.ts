import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * O corte que a produção publica está escrito em TRÊS lugares, e eles precisam
 * contar a mesma história.
 *
 * POR QUE ISTO EXISTE. Quem monta um build novo lê o `.env.example` — é a única
 * lista de quais variáveis existem. Quem publica de verdade é o workflow. Quem
 * lê as variáveis é o `src/shared/flags.ts`. Os três divergirem não produz erro
 * nenhum: produz um build errado com cara de build certo, no ar, servindo outro
 * jogo. Já aconteceu na #137 — um endereço serviu a Arena, o outro serviu o
 * fluxo de telas velho, e ninguém foi avisado.
 *
 * A FONTE DE VERDADE É O WORKFLOW. Ele é o único lugar do repositório que
 * publica de fato. O `.env.example` carrega uma cópia declarada porque é o
 * arquivo que a pessoa está lendo na hora do build, e mandar ela abrir um YAML
 * de CI seria o mesmo defeito com outra roupa. A cópia é travada aqui.
 *
 * NÃO BATE NA REDE. Comparar com o que `aue.web.app` serve exigiria internet, e
 * teste que fica vermelho porque o wifi caiu é teste que alguém deleta. A prova
 * contra a produção de verdade continua sendo o `diff` dos `assets/main-*.js`
 * documentado em `docs/technical/hospedagem-firebase.md`.
 */

function ler(caminhoRelativo: string): string {
  // Sem o `\r`: no Windows o checkout vem com CRLF e todo `\n` da regex erraria
  // por um caractere invisível.
  return readFileSync(fileURLToPath(new URL(caminhoRelativo, import.meta.url)), 'utf8').replace(
    /\r\n/g,
    '\n',
  );
}

const ENV_EXAMPLE = ler('../.env.example');
const ENV_CASCA = ler('../.env.casca');
const FLAGS_TS = ler('./shared/flags.ts');
const WORKFLOW = ler('../.github/workflows/publicar-firebase.yml');

const NOME_DO_STEP = 'Build de produção';

/** Toda `VITE_FEATURE_*` declarada no `.env.example`, ligada ou não. */
function catalogoDoEnvExample(): string[] {
  return [...ENV_EXAMPLE.matchAll(/^(VITE_FEATURE_[A-Z_]+)=/gm)].map((m) => m[1]).sort();
}

/** Toda `VITE_FEATURE_*` que o `flags.ts` lê de fato. */
function catalogoDoFlagsTs(): string[] {
  return [...FLAGS_TS.matchAll(/import\.meta\.env\.(VITE_FEATURE_[A-Z_]+)/g)]
    .map((m) => m[1])
    .sort();
}

/** A lista que o `.env.example` DECLARA como corte de produção. */
function corteDeclaradoNoEnvExample(): string[] {
  const bloco = /^# LIGADAS NO CORTE DE PRODUÇÃO:\n((?:#\s+VITE_FEATURE_[A-Z_]+\n)+)/m.exec(
    ENV_EXAMPLE,
  );
  expect(
    bloco,
    'sumiu o bloco "LIGADAS NO CORTE DE PRODUÇÃO:" do .env.example — é a lista que quem monta um build lê',
  ).toBeTruthy();

  return [...bloco![1].matchAll(/VITE_FEATURE_[A-Z_]+/g)].map((m) => m[0]).sort();
}

/** O corte que o workflow PUBLICA — o step de build é a fonte de verdade. */
function corteDoWorkflow(): string[] {
  const step = new RegExp(`- name: ${NOME_DO_STEP}\\n([\\s\\S]*?)(?=\\n      - name: |$)`).exec(
    WORKFLOW,
  );
  expect(
    step,
    `não achei o step "${NOME_DO_STEP}" no workflow — se ele mudou de nome, quem está desatualizado é ESTE teste, não uma flag`,
  ).toBeTruthy();

  return ligadas(step![1]);
}

/** As `VITE_FEATURE_*` com valor `1`/`true` num trecho de YAML ou de `.env`. */
function ligadas(trecho: string): string[] {
  return [...trecho.matchAll(/(VITE_FEATURE_[A-Z_]+)\s*[:=]\s*'?"?(\w+)"?'?/g)]
    .filter(([, , valor]) => valor.toLowerCase() === '1' || valor.toLowerCase() === 'true')
    .map(([, nome]) => nome)
    .sort();
}

describe('o corte de produção — os três lugares falam a mesma coisa', () => {
  it('o step de build do workflow existe com o nome que este teste procura', () => {
    // Primeira asserção de propósito: se o step sumiu, TODAS as outras falhariam
    // por motivo errado, culpando uma flag quando o problema é o teste.
    expect(corteDoWorkflow().length).toBeGreaterThan(0);
  });

  it('o catálogo do .env.example é o mesmo do flags.ts', () => {
    // Flag que existe no código e não está documentada é flag que ninguém liga.
    // Flag documentada que não existe mais é gente perdendo tempo procurando.
    expect(catalogoDoEnvExample()).toEqual(catalogoDoFlagsTs());
  });

  it('a lista declarada no .env.example é a que o workflow publica', () => {
    const declarado = corteDeclaradoNoEnvExample();
    const publicado = corteDoWorkflow();

    for (const flag of publicado) {
      expect(
        declarado,
        `a flag ${flag} está ligada no workflow e não está na lista do .env.example`,
      ).toContain(flag);
    }
    for (const flag of declarado) {
      expect(
        publicado,
        `a flag ${flag} está na lista do .env.example e o workflow não liga`,
      ).toContain(flag);
    }
  });

  it('a casca não liga nada que a web não ligue', () => {
    /*
      Os dois cortes PODEM ser diferentes — a casca não tem fluxo velho para
      servir e hoje liga só a Arena. O que não pode é a casca ligar algo que a
      web não liga sem ninguém ter escrito por quê.
    */
    const daCasca = ligadas(ENV_CASCA);
    const daWeb = corteDoWorkflow();

    for (const flag of daCasca) {
      expect(
        daWeb,
        `a casca liga ${flag} e a web não. Os dois cortes podem ser diferentes de propósito, mas isso precisa estar escrito no .env.casca antes de passar por aqui`,
      ).toContain(flag);
    }
  });
});
