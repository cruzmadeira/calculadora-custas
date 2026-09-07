/* Câmara Arbitral da Administração Pública · Calculadora de Custas — camada de interface */
"use strict";
(function () {
  const $ = (s) => document.querySelector(s);
  const form = $("#form");
  const campoValor = $("#valor");
  const grupoArbitros = $("#grupo-arbitros");
  const grupoRegistro = $("#grupo-registro");
  const grupoCertidao = $("#grupo-certidao");
  const certidao = $("#certidao");
  const erro = $("#erro");
  const resultado = $("#resultado");

  const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  /* ---------- máscara simples de moeda ---------- */
  function parseValor(txt) {
    const digitos = (txt || "").replace(/\D/g, "");
    return digitos ? Number(digitos) / 100 : NaN;
  }
  campoValor.addEventListener("input", () => {
    const v = parseValor(campoValor.value);
    campoValor.value = Number.isFinite(v)
      ? v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : "";
  });

  /* ---------- visibilidade condicional ---------- */
  function procedimentoAtual() {
    return form.querySelector('input[name="procedimento"]:checked').value;
  }
  function atualizarVisibilidade() {
    const p = procedimentoAtual();
    grupoArbitros.hidden = p !== "comum";
    grupoRegistro.hidden = p === "emergencia";
    const previo = form.querySelector('input[name="registro"]:checked').value === "sim";
    grupoCertidao.hidden = !(previo && p !== "emergencia");
  }
  form.addEventListener("change", atualizarVisibilidade);
  atualizarVisibilidade();

  /* ---------- cálculo e demonstrativo ---------- */
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    erro.hidden = true;

    const valor = parseValor(campoValor.value);
    const p = procedimentoAtual();
    const registroPago = !grupoRegistro.hidden &&
      form.querySelector('input[name="registro"]:checked').value === "sim";

    if (!Number.isFinite(valor) || valor <= 0) {
      return falha("Informe o valor da controvérsia para calcular.");
    }
    if (registroPago && !(certidao.files && certidao.files.length)) {
      return falha("Anexe a certidão de registro para comprovar o recolhimento — sem ela, a Taxa de Registro de R$ 3.000,00 será incluída no cálculo.");
    }

    const res = CalcCustas.calcular({
      valor,
      procedimento: p,
      arbitros: Number($("#arbitros").value),
      registroPago,
    });
    if (res.erro) return falha(res.erro);
    render(res, registroPago ? certidao.files[0].name : null);
  });

  function falha(msg) {
    erro.textContent = msg;
    erro.hidden = false;
    resultado.hidden = true;
  }

  function render(res, nomeCertidao) {
    const nomes = { comum: "Procedimento comum", expedito: "Procedimento expedito", emergencia: "Procedimento de emergência" };
    $("#demo-meta").textContent =
      `${nomes[res.procedimento]}${res.arbitros ? " · " + (res.arbitros === 3 ? "Tribunal de 3 árbitros" : "árbitro único") : ""}` +
      ` · valor da controvérsia: ${BRL.format(res.valor)}` +
      ` · emitido em ${new Date().toLocaleDateString("pt-BR")}`;

    $("#demo-linhas").innerHTML = res.linhas
      .map(([nome, v]) => `<tr><td>${nome}${nomeCertidao && v === 0 ? ` <em class="anexo">(certidão: ${escapeHtml(nomeCertidao)})</em>` : ""}</td><td class="num">${BRL.format(v)}</td></tr>`)
      .join("");
    $("#demo-total").textContent = BRL.format(res.total);

    $("#demo-cadencia").innerHTML = res.pagamento
      ? `<p class="pagamento-unico">${res.pagamento}</p>`
      : "";

    $("#demo-avisos").innerHTML = (res.avisos || []).map((a) => `<li>${a}</li>`).join("");
    resultado.hidden = false;
    resultado.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }


  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }

  $("#imprimir").addEventListener("click", () => window.print());
})();
