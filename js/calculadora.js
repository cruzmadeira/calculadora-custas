/* =========================================================================
 * Câmara Arbitral da Administração Pública
 * calculadora.js — núcleo de cálculo da Tabela de Custas (v6, set/2026)
 * Funções puras, sem DOM: utilizáveis no navegador e em Node (testes).
 * Valores em reais (Number). Atualização anual pelo IPCA.
 * ========================================================================= */

"use strict";

const TABELA = {
  taxaRegistro: 3000.0,         // Taxa de Registro (única) — reembolsável só se não instaurado
  admin: {
    base: 6000.0,               // parcela fixa até R$ 100 mil
    limiteBase: 100_000,
    faixas: [                   // [limiteSuperior, alíquota marginal sobre a parcela na faixa]
      [500_000, 0.025],
      [1_000_000, 0.028],       // chega a R$ 30.000 em R$ 1 milhão
      [5_000_000, 0.016],
      [20_000_000, 0.007],
      [50_000_000, 0.0035],
      [100_000_000, 0.0018],
      [Infinity, 0.0005],
    ],
    teto: 550000.0,
  },
  honorarios: {
    base: 12000.0,              // parcela fixa até R$ 100 mil
    limiteBase: 100_000,
    faixas: [
      [500_000, 0.05],
      [1_000_000, 0.056],       // chega a R$ 60.000 em R$ 1 milhão
      [5_000_000, 0.03],
      [20_000_000, 0.014],
      [50_000_000, 0.007],
      [100_000_000, 0.0035],
      [Infinity, 0.0012],
    ],
    teto: 1800000.0,
    tribunalFator: 2.4,
    presidenteFator: 0.86,
    coarbitroFator: 0.77,
  },
  expedito: {
    limite: 2_000_000,
    fator: 0.7,
    pisoAdmin: 4200.0,
    pisoHonorarios: 8400.0,
  },
  emergencia: {
    taxaUrgencia: 15000.0,
    honorariosAte20M: 40000.0,
    honorariosAcima20M: 60000.0,
    limiar: 20_000_000,
  },
  provisaoDespesas: { aliquota: 0.0005, minimo: 2000.0, maximo: 10000.0 },
};

const round2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;

/** Cálculo marginal acumulativo genérico. */
function marginal(valor, base, limiteBase, faixas, teto) {
  if (!(valor > 0)) return 0;
  let total = base;
  let anterior = limiteBase;
  for (const [limite, aliquota] of faixas) {
    if (valor <= anterior) break;
    const parcela = Math.min(valor, limite) - anterior;
    total += parcela * aliquota;
    anterior = limite;
  }
  return round2(Math.min(total, teto));
}

/** Taxa de administração — procedimento comum. */
function taxaAdministracao(valor) {
  const a = TABELA.admin;
  return marginal(valor, a.base, a.limiteBase, a.faixas, a.teto);
}

/** Honorários de árbitro único — procedimento comum. */
function honorariosUnico(valor) {
  const h = TABELA.honorarios;
  return marginal(valor, h.base, h.limiteBase, h.faixas, h.teto);
}

/** Honorários do tribunal de 3 árbitros, com repartição. */
function honorariosTribunal(valor) {
  const unico = honorariosUnico(valor);
  const h = TABELA.honorarios;
  return {
    total: round2(unico * h.tribunalFator),
    presidente: round2(unico * h.presidenteFator),
    coarbitro: round2(unico * h.coarbitroFator),
  };
}

/** Provisão inicial de despesas reembolsáveis. */
function provisaoDespesas(valor) {
  const p = TABELA.provisaoDespesas;
  return round2(Math.min(Math.max(valor * p.aliquota, p.minimo), p.maximo));
}

/**
 * Cálculo completo.
 * @param {Object} opts
 * @param {number} opts.valor - valor da controvérsia em R$
 * @param {"comum"|"expedito"|"emergencia"} opts.procedimento
 * @param {1|3} [opts.arbitros=1] - só no procedimento comum
 * @param {boolean} [opts.registroPago=false] - Taxa de Registro já recolhida (certidão)
 */
function calcular(opts) {
  const valor = Number(opts.valor);
  const procedimento = opts.procedimento;
  const arbitros = opts.arbitros === 3 ? 3 : 1;
  const registroPago = Boolean(opts.registroPago);
  const avisos = [];

  if (!Number.isFinite(valor) || valor <= 0) {
    return { erro: "Informe um valor da controvérsia maior que zero." };
  }

  // -------- Procedimento de emergência (autônomo) --------
  if (procedimento === "emergencia") {
    const e = TABELA.emergencia;
    const honor = valor <= e.limiar ? e.honorariosAte20M : e.honorariosAcima20M;
    const linhas = [
      ["Taxa institucional de urgência", e.taxaUrgencia],
      ["Honorários do Árbitro de Emergência", honor],
    ];
    return {
      procedimento,
      valor,
      linhas,
      total: round2(e.taxaUrgencia + honor),
      pagamento: "Integral, com o requerimento de emergência.",
      avisos: [
        "Valores autônomos e não abatíveis das custas do procedimento arbitral principal.",
        "A Taxa de Registro e as custas do procedimento principal são calculadas separadamente.",
      ],
    };
  }

  // -------- Comum / Expedito --------
  let proc = procedimento;
  if (proc === "expedito" && valor > TABELA.expedito.limite) {
    proc = "comum";
    avisos.push(
      "Valor superior a R$ 2.000.000,00: o procedimento expedito não é cabível — cálculo exibido para o procedimento comum."
    );
  }

  const registro = registroPago ? 0 : TABELA.taxaRegistro;
  if (registroPago) {
    avisos.push(
      "Taxa de Registro já recolhida: nada mais é devido a esse título — anexe a certidão de registro ao Requerimento."
    );
  }

  let admin, honorLinhas, honorTotal, nArb;
  if (proc === "expedito") {
    nArb = 1;
    const f = TABELA.expedito;
    admin = round2(Math.max(taxaAdministracao(valor) * f.fator, f.pisoAdmin));
    honorTotal = round2(Math.max(honorariosUnico(valor) * f.fator, f.pisoHonorarios));
    honorLinhas = [["Honorários do árbitro único (expedito)", honorTotal]];
    avisos.push("Procedimento expedito: sempre árbitro único; não comporta prova pericial; primeiro pedido de esclarecimentos sem custo.");
  } else {
    nArb = arbitros;
    admin = taxaAdministracao(valor);
    if (nArb === 3) {
      const t = honorariosTribunal(valor);
      honorTotal = t.total;
      honorLinhas = [
        ["Honorários — presidente do Tribunal", t.presidente],
        ["Honorários — coárbitro (1º)", t.coarbitro],
        ["Honorários — coárbitro (2º)", t.coarbitro],
      ];
    } else {
      honorTotal = honorariosUnico(valor);
      honorLinhas = [["Honorários do árbitro único", honorTotal]];
    }
  }

  const provisao = provisaoDespesas(valor);
  const linhas = [
    [registroPago ? "Taxa de Registro (já recolhida — certidão anexa)" : "Taxa de Registro (única)", registro],
    ["Taxa de administração", admin],
    ...honorLinhas,
    ["Provisão inicial de despesas (reembolsável o saldo)", provisao],
  ];
  const total = round2(registro + admin + honorTotal + provisao);

  return {
    procedimento: proc,
    arbitros: nArb,
    valor,
    registro,
    admin,
    honorarios: honorTotal,
    provisao,
    linhas,
    total,
    pagamento: "Pagamento único e integral, com o Requerimento de Instauração — condição de admissão e processamento.",
    avisos,
  };
}

const CalcCustas = {
  TABELA, taxaAdministracao, honorariosUnico, honorariosTribunal,
  provisaoDespesas, calcular, round2,
};

if (typeof module !== "undefined" && module.exports) module.exports = CalcCustas;
if (typeof window !== "undefined") window.CalcCustas = CalcCustas;
