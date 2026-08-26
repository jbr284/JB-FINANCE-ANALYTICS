// === modulos/motor-calculadora.js ===

export const regras = {
    anoVigencia: 2026,
    tetoINSS: 8475.55,
    percentualAdiantamento: 0.4,
    percentualAdicionalNoturno: 0.35,
    descontoFixoVA: 23.97,
    percentualVT: 0.06,
    valorSindicato: 50.00, 
    deducaoPorDependenteIRRF: 189.59,
    tabelaINSS: [
      { ate: 1621.00, aliquota: 0.075, deduzir: 0 },
      { ate: 2902.84, aliquota: 0.09, deduzir: 24.32 },
      { ate: 4354.27, aliquota: 0.12, deduzir: 111.40 },
      { ate: 8475.55, aliquota: 0.14, deduzir: 198.49 }
    ],
    tabelaIRRF: [
      { ate: 2428.80, aliquota: 0, deduzir: 0 },
      { ate: 2826.65, aliquota: 0.075, deduzir: 182.16 },
      { ate: 3751.05, aliquota: 0.15, deduzir: 394.16 },
      { ate: 4664.68, aliquota: 0.225, deduzir: 675.49 },
      { ate: "acima", aliquota: 0.275, deduzir: 908.73 }
    ],
    planosSESI: { nenhum: 0, basico_individual: 29, basico_familiar: 58, plus_individual: 120, plus_familiar: 189 }
};

// --- MOTOR DO CALENDÁRIO ---
export function calcularCalendario(ano, mes, extrasArray = []) {
    const diasNoMes = new Date(ano, mes, 0).getDate();

    // Cálculo da Páscoa (Algoritmo de Meeus/Jones/Butcher)
    const a = ano % 19; const b = Math.floor(ano / 100); const c = ano % 100;
    const d = Math.floor(b / 4); const e = b % 4; const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3); const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4); const k = c % 4; const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mesPascoa = Math.floor((h + l - 7 * m + 114) / 31);
    const diaPascoa = ((h + l - 7 * m + 114) % 31) + 1;

    const pascoa = new Date(ano, mesPascoa - 1, diaPascoa);
    const sextaSanta = new Date(pascoa); sextaSanta.setDate(pascoa.getDate() - 2);
    const carnaval = new Date(pascoa); carnaval.setDate(pascoa.getDate() - 47);
    const corpusChristi = new Date(pascoa); corpusChristi.setDate(pascoa.getDate() + 60);

    const formatarDDMM = (dt) => String(dt.getDate()).padStart(2, '0') + '/' + String(dt.getMonth() + 1).padStart(2, '0');
    const feriadosMoveis = [formatarDDMM(sextaSanta), formatarDDMM(carnaval), formatarDDMM(corpusChristi)];
    const feriadosFixos = ["01/01", "21/04", "01/05", "07/09", "12/10", "02/11", "15/11", "25/12"];

    let diasUteis = 0; let domFeriados = 0;

    for (let d = 1; d <= diasNoMes; d++) {
        const dataAtual = new Date(ano, mes - 1, d);
        const diaSemana = dataAtual.getDay();
        const dataStr = String(d).padStart(2, '0') + '/' + String(mes).padStart(2, '0');

        if (diaSemana === 0 || feriadosFixos.includes(dataStr) || feriadosMoveis.includes(dataStr) || extrasArray.includes(dataStr)) {
            domFeriados++;
        } else {
            diasUteis++;
        }
    }
    return { diasUteis, domFeriados, diasNoMes };
}

// --- MOTOR FINANCEIRO (IMPOSTOS) ---
export function calcularINSS(base) {
    if (base > regras.tetoINSS) base = regras.tetoINSS;
    for (const faixa of regras.tabelaINSS) {
        if (base <= faixa.ate) return (base * faixa.aliquota) - faixa.deduzir;
    }
    const ultima = regras.tabelaINSS[regras.tabelaINSS.length - 1];
    return (base * ultima.aliquota) - ultima.deduzir;
}

export function calcularIRRF(baseCalculo, dependentes, rendimentosTributaveis) {
    if (rendimentosTributaveis <= 5000) return 0;
    const deducoesDependentes = dependentes * regras.deducaoPorDependenteIRRF;
    const baseFinal = Math.max(0, baseCalculo - deducoesDependentes);
    let impostoBruto = 0;
    
    for (const faixa of regras.tabelaIRRF) {
        if (faixa.ate === "acima" || baseFinal <= faixa.ate) {
            impostoBruto = (baseFinal * faixa.aliquota) - faixa.deduzir;
            break;
        }
    }
    if (rendimentosTributaveis > 5000 && rendimentosTributaveis <= 7350) {
        const redutor = 978.62 - (0.133145 * rendimentosTributaveis);
        if (redutor > 0) impostoBruto -= redutor;
    }
    return Math.max(0, impostoBruto);
}

// --- O CÁLCULO FINAL ---
export function calcularSalarioCompleto(inputs) {
    const { salario, diasTrab, dependentes, faltas, atrasos, he50, he60, he80, he100, he150, noturno, plano, coparticipacao, assistencial, sindicato, emprestimo, diasUteis, domFeriados, descontarVT } = inputs;
    
    const diasEfetivos = (!diasTrab || diasTrab === 0) ? 30 : diasTrab;
    const valorDia = salario / 30;
    const valorHora = salario / 220;

    const vencBase = valorDia * diasEfetivos;
    const valorHE50 = he50 * valorHora * 1.5;
    const valorHE60 = he60 * valorHora * 1.6;
    const valorHE80 = he80 * valorHora * 1.8;
    const valorHE100 = he100 * valorHora * 2.0;
    const valorHE150 = he150 * valorHora * 2.5;
    const valorNoturno = noturno * valorHora * regras.percentualAdicionalNoturno;
    
    const totalHE = valorHE50 + valorHE60 + valorHE80 + valorHE100 + valorHE150;
    const dsrHE = (diasUteis > 0) ? (totalHE / diasUteis) * domFeriados : 0;
    const dsrNoturno = (diasUteis > 0) ? (valorNoturno / diasUteis) * domFeriados : 0;
    
    const totalBruto = vencBase + totalHE + valorNoturno + dsrHE + dsrNoturno;

    const descontoFaltas = faltas * valorDia;
    const descontoAtrasos = atrasos * valorHora;
    const adiantamento = (salario / 30) * diasEfetivos * regras.percentualAdiantamento;
    const descontoVA = regras.descontoFixoVA;
    const descontoVT = descontarVT ? (salario * regras.percentualVT) : 0;
    
    const baseINSS = totalBruto - descontoFaltas - descontoAtrasos;
    const inss = calcularINSS(baseINSS);
    const baseIRRF = baseINSS - inss;
    const irrf = calcularIRRF(baseIRRF, dependentes, totalBruto);
    
    const descontoPlano = regras.planosSESI[plano] || 0;
    const descontoSindicato = sindicato === 'sim' ? regras.valorSindicato : 0;
    
    const totalDescontos = descontoFaltas + descontoAtrasos + descontoPlano + coparticipacao + assistencial + descontoSindicato + emprestimo + inss + irrf + descontoVA + adiantamento + descontoVT;
    const liquido = totalBruto - totalDescontos;

    return { totalBruto, totalDescontos, liquido, inss, irrf, adiantamento };
}
