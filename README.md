# Calculadora de Custas — Câmara Arbitral da Administração Pública

Sistema estático (HTML + CSS + JavaScript puro, sem dependências e sem backend) que calcula
as custas dos procedimentos arbitrais da Câmara Arbitral da Administração Pública conforme a Tabela de Custas vigente
(Arquitetura Financeira v4, set/2026).

## Funcionalidades

- Entrada do **valor da controvérsia** com máscara monetária pt-BR;
- Escolha do procedimento: **comum** (árbitro único ou tribunal de 3), **expedito**
  (causas sem perícia de até R$ 2 milhões, sempre árbitro único, custas a 70% com pisos) ou **emergência**
  (taxa de urgência + honorários do Árbitro de Emergência, autônomos);
- **Taxa de Registro única (R$ 3.000)**: quem já a recolheu na celebração do contrato
  anexa a certidão recebida por e-mail e nada paga a esse título; quem não recolheu
  vê o valor automaticamente somado ao pagamento único da abertura (reembolsável,
  nos termos da Tabela, apenas se o procedimento não for instaurado);
- Demonstrativo em estilo de certidão: linhas de verbas e **total do pagamento
  único e integral na abertura** (condição de admissão e processamento), com avisos
  automáticos (expedito acima do limite, registro já recolhido etc.) e impressão;
- Cálculo por **faixas marginais acumulativas** com tetos (administração R$ 550.000;
  honorários R$ 1.800.000) e repartição do tribunal (presidente 0,86×; coárbitros 0,77×).

## Estrutura

```
calculadora-custas/
├── index.html          # página única da calculadora
├── css/style.css       # identidade visual da Câmara (navy/crimson/dourado, Segoe UI)
└── js/
    ├── calculadora.js  # núcleo de cálculo (funções puras; roda em Node e no navegador)
    └── app.js          # camada de interface (máscara, validações, demonstrativo)
```

## Executar localmente

Basta abrir `index.html` no navegador — não há build nem servidor.
Opcionalmente: `python3 -m http.server` na pasta e acessar `http://localhost:8000`.

## Testar o núcleo de cálculo

```bash
node -e "const C=require('./js/calculadora.js'); console.log(C.calcular({valor:1000000, procedimento:'comum'}))"
```

Os valores de verificação da Tabela: administração R$ 30.000 (R$ 1 mi), R$ 94.000 (R$ 5 mi),
R$ 199.000 (R$ 20 mi), teto R$ 550.000; honorários de árbitro único R$ 60.000 (R$ 1 mi),
R$ 180.000 (R$ 5 mi), teto R$ 1.800.000.

## Publicar no GitHub (Pages)

```bash
git init
git add .
git commit -m "Calculadora de Custas v1.0"
git branch -M main
git remote add origin https://github.com/<usuario>/calculadora-custas.git
git push -u origin main
```

Depois, em **Settings → Pages**, selecione `Deploy from a branch`, branch `main`, pasta `/ (root)`.
A calculadora ficará em `https://<usuario>.github.io/calculadora-custas/` — e pode ser incorporada
ao site institucional via `<iframe>` ou publicada no domínio próprio apontando o CNAME.

## Atualização anual da Tabela

Todos os parâmetros (valores, alíquotas, pisos, tetos, limites e cadências) estão
centralizados no objeto `TABELA`, no topo de `js/calculadora.js`. A atualização pelo IPCA
consiste em editar esse único objeto — nenhuma outra alteração é necessária.

## Avisos

Simulação sem valor de cobrança. Prevalecem, sempre, o Regulamento e a Tabela de Custas
oficiais publicados pela Câmara. Nos procedimentos que envolvam a Administração Pública,
os adiantamentos são suportados integralmente pela parte privada contratada, com
recomposição final pela sucumbência (somente despesas processuais, corrigidas pela tabela
do TJMG ou equivalente, a critério do Tribunal Arbitral; não há honorários advocatícios de
sucumbência).
