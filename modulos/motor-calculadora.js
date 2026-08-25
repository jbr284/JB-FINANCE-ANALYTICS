// === modulos/motor-calculadora.js ===

export const regras = {
    anoVigencia: 2026,
    salarioMinimo: 1621.00,
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
    
    planosSESI: {
      nenhum: 0,
      basico_individual: 29,
      basico_familiar: 58,
      plus_individual: 120, 
      plus_familiar: 189   
    }
};

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

export function calcularSalarioCompleto(inputs) {
    const { 
        salario, diasTrab, dependentes, faltas, atrasos, 
        he50, he60, he80, he100, he150, noturno, 
        plano, coparticipacao, assistencial, sindicato, 
        emprestimo, diasUteis, domFeriados, descontarVT 
    } = inputs;
    
    const diasEfetivos = (!diasTrab || diasTrab === 0) ? 30 : diasTrab;
    const valorDia = salario / 30;
    const valorHora = salario / 220;

    // Proventos
    const vencBase = valorDia * diasEfetivos;
    const valorHE50 = he50 * valorHora * 1.5;
    const valorHE60 = he60 * valorHora * 1.6;
    const valorHE80 = he80 * valorHora * 1.8;
    const valorHE100 = he100 * valorHora * 2.0;
    const valorHE150 = he150 * valorHora * 2.5;
    const valorNoturno = noturno * valorHora * regras.percentualAdicionalNoturno;
    
    // DSR Cirúrgico
    const totalHE = valorHE50 + valorHE60 + valorHE80 + valorHE100 + valorHE150;
    const dsrHE = (diasUteis > 0) ? (totalHE / diasUteis) * domFeriados : 0;
    const dsrNoturno = (diasUteis > 0) ? (valorNoturno / diasUteis) * domFeriados : 0;
    
    const totalBruto = vencBase + totalHE + valorNoturno + dsrHE + dsrNoturno;

    // Descontos Básico
    const descontoFaltas = faltas * valorDia;
    const descontoAtrasos = atrasos * valorHora;
    const adiantamento = (salario / 30) * diasEfetivos * regras.percentualAdiantamento;
    const descontoVA = regras.descontoFixoVA;
    const descontoVT = descontarVT ? (salario * regras.percentualVT) : 0;
    
    // Impostos
    const baseINSS = totalBruto - descontoFaltas - descontoAtrasos;
    const inss = calcularINSS(baseINSS);
    
    const baseIRRF = baseINSS - inss;
    const irrf = calcularIRRF(baseIRRF, dependentes, totalBruto);
    
    // Convênios e Sindicato
    const descontoPlano = regras.planosSESI[plano] || 0;
    const descontoSindicato = sindicato === 'sim' ? regras.valorSindicato : 0;
    
    const totalDescontos = descontoFaltas + descontoAtrasos + descontoPlano + coparticipacao + assistencial + descontoSindicato + emprestimo + inss + irrf + descontoVA + adiantamento + descontoVT;
    const liquido = totalBruto - totalDescontos;

    return { totalBruto, totalDescontos, liquido, inss, irrf, adiantamento };
}
