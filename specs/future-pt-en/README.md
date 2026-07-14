# i18n PT/EN — implementacao experimental (NAO MERGEAR)

Snapshot da adaptacao experimental do projeto para duas linguas (portugues e ingles),
salvo em `source/` como referencia futura.

**Status:** codigo experimental nao-integrado. NAO reaplicar sem demanda real.

## Quando reaplicar

Primeiro cliente EN real:
- Lead assinado, contrato com empresa de fora do BR, OU
- Feature request com prazo firme de produto.

NAO reaplicar especulativamente. Se for "preparar pra futuro", o custo de adicionar
i18n quando aparecer a demanda real e menor do que manter 700 chaves duplicadas hoje
sem ninguem consumindo.

## Como reaplicar

Os 50 arquivos modificados estao em `source/` espelhando a estrutura do `src/` original.
O unico arquivo novo e `src/core/services/ai/prompts/language.ts` (tambem em `source/`).

Para restaurar no projeto:

```bash
# 1. Copiar arquivos modificados por cima do src/
#    (sobrescreve sem mexer em arquivos nao listados)
xcopy /Y /E /I specs\future-pt-en\source\src\* src\

# 2. Adicionar LangProvider no App.tsx (se ainda nao estiver)
#    e o dropdown de idioma no Sidebar

# 3. Resolver os problemas conhecidos antes de mergear (ver abaixo)
```

Em Linux/macOS:

```bash
cp -r specs/future-pt-en/source/src/* src/
```

## Estrutura deste diretorio

```
specs/future-pt-en/
  README.md                  # este arquivo
  untracked-files.txt        # lista de arquivos nao-rastreados no momento do snapshot
  source/                    # snapshot dos 51 arquivos da implementacao
    src/
      common/components/
        AddCandidateModal.tsx
        OnboardingModal.tsx
      core/
        contexts/
          AnalysisContext.tsx
          LangContext.tsx           # stub de 94 linhas virou dicionario de 3043 linhas
        config/permissions.ts
        services/
          ai/
            prompts/
              extraction.ts
              job-matching.ts
              language.ts            # NOVO (criado nesta implementacao)
              resume.ts
              scoring.ts
          analyzers/resumeAnalyzer.ts
          cvAnalyzer.ts
          ...
```

51 arquivos no total: 50 modificados + 1 novo (`language.ts`).

## Problemas conhecidos desta versao (NAO reaplicar como-esta)

1. **`t('foo')` sem type-safety** — `LangContext.tsx` retorna a propria chave como fallback
   em caso de typo. Chaves silenciosamente faltando viram UI em branco. Resolver com
   tipo derivado: `type TranslationKey = keyof typeof translations.pt`.

2. **Labels da IA duplicados** — os pares `FORTE/MEDIO/NAO ADERENTE` aparecem em 3 lugares:
   `prompts/language.ts`, `prompts/scoring.ts` (inline), e `prompts/extraction.ts` (inline).
   Adicionar um idioma novo = editar 3 arquivos. Centralizar em `language.ts` e importar.

3. **Erros do `cvAnalyzer.ts` foram para ingles fixo** — `Extraction error:`, `AI error:`,
   `Excel read error:`, `PDF "...has no extractable text and image analysis failed:`.
   Hoje sao console-only (nao chegam na UI), mas sao um cheiro. Ou traduzir propagando
   `lang`, ou reverter pra portugues com comentario `ponytail:` log-only.

4. **Parsing de texto livre da IA** — `AnalysisContext.tsx:81` ganhou lista paralela
   `['not informed', 'unknown', 'not identified']` para parsing de string normalizada.
   Frgil: se a IA devolver `N/A` ou `Unidentified` em outro formato, passa. Solucao
   certa: campo estruturado (`null`), nao string normalizada.
   Marcar com: `ponytail: parsing free-text, replace when AI returns structured null`.

5. **Chave `idioma` morta** — definida em PT e EN mas nunca usada (so `t('language')`).
   Apagar uma.

6. **Sem lint que valide chaves em build** — toda nova string no JSX passa pelo `t()`
   sem checagem. Um script de 10 linhas (`Object.keys(translations.pt).includes(key)` em
   fail-fast na build) evita regressao silenciosa.

## Alternativa melhor (ao reaplicar)

Reescrever do zero com a licao aprendida:
- Context tipado (`type TranslationKey = keyof typeof pt`) — resolve #1 e #6.
- Labels da IA centralizados em `prompts/language.ts` — resolve #2.
- Erros do `cvAnalyzer.ts` propagando `lang` ou revertendo pra PT — resolve #3.
- AI retorna campos estruturados (`null` em vez de string normalizada) — resolve #4.

Estimativa: 1 sprint contra 700 chaves duplicadas mantidas sem motivo.

## Historico

- Snapshot capturado em `usabit-people-v_1.2` @ `1ac6664`.
- Antes do snapshot: 4883 insercoes / 1987 delecoes em 50 arquivos.
- Working tree do projeto foi revertido para o estado de producao (HEAD) apos snapshot.