// === app.js (O Maestro Orquestrador) ===

import { 
    auth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
    db, collection, getDocs
} from './modulos/firebase-config.js';

import { 
    obterPeriodo, carregarDadosSaripan, salvarApontamentoNoBanco, 
    excluirApontamentoNoBanco, excluirQuinzenaNoBanco 
} from './modulos/motor-saripan.js';

import { 
    BENEFICIOS_FIXOS, carregarDadosModular, buscarSalarioBaseConfigurado, 
    salvarSalarioBaseNoBanco, salvarFechamentoNoBanco, 
    excluirFechamentoNoBanco, verificarGeracaoAdiantamento 
} from './modulos/motor-modular.js';

import { 
    calcularSalarioCompleto, calcularCalendario 
} from './modulos/motor-calculadora.js';

import { setDoc, doc, deleteDoc } from './modulos/firebase-config.js';

window.registros = [];
window.registrosModular = [];
window.registrosExtra = [];
window.chartsAtivos = [];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// ==========================================
// PONTE DA CALCULADORA CIRÚRGICA (CALENDÁRIO AUTOMÁTICO)
// ==========================================
window.atualizarCalendarioCalculadora = () => {
    const mesStr = document.getElementById('calc-mes-ref').value;
    if (!mesStr) return;

    const [ano, mes] = mesStr.split('-').map(Number);
    const extrasStr = document.getElementById('calc-feriados-extras').value;
    const extrasArray = extrasStr ? extrasStr.split(',').map(d => d.trim()) : [];

    const calendario = calcularCalendario(ano, mes, extrasArray);

    document.getElementById('calc-diasuteis').value = calendario.diasUteis;
    document.getElementById('calc-domferiados').value = calendario.domFeriados;
    document.getElementById('calc-dias').value = calendario.diasNoMes;
};

window.calcularEInjetarModularCirurgico = () => {
    const salarioBase = parseFloat(localStorage.getItem('modular_salario_base')) || 0;
    if(salarioBase <= 0) return alert("Configure o Salário Base Contratual primeiro!");

    const diasUteis = parseFloat(document.getElementById('calc-diasuteis').value) || 0;
    const domFeriados = parseFloat(document.getElementById('calc-domferiados').value) || 0;

    if (diasUteis === 0 && domFeriados === 0) {
        return alert("Selecione o Mês da Folha no calendário da Calculadora para gerar os Dias Úteis e Feriados!");
    }

    const inputs = {
        salario: salarioBase,
        diasTrab: parseFloat(document.getElementById('calc-dias').value) || 30,
        dependentes: parseFloat(document.getElementById('calc-dependentes').value) || 0,
        faltas: parseFloat(document.getElementById('calc-faltas').value) || 0,
        atrasos: parseFloat(document.getElementById('calc-atrasos').value) || 0,
        he50: parseFloat(document.getElementById('calc-he50').value) || 0,
        he60: parseFloat(document.getElementById('calc-he60').value) || 0,
        he80: parseFloat(document.getElementById('calc-he80').value) || 0,
        he100: parseFloat(document.getElementById('calc-he100').value) || 0,
        he150: parseFloat(document.getElementById('calc-he150').value) || 0,
        noturno: parseFloat(document.getElementById('calc-noturno').value) || 0,
        plano: document.getElementById('calc-plano').value,
        coparticipacao: parseFloat(document.getElementById('calc-copart').value) || 0,
        assistencial: 0,
        sindicato: document.getElementById('calc-sindicato').value,
        emprestimo: parseFloat(document.getElementById('calc-emprestimo').value) || 0,
        diasUteis: diasUteis,
        domFeriados: domFeriados,
        descontarVT: document.getElementById('calc-vt').value === 'sim'
    };

    const resultado = calcularSalarioCompleto(inputs);

    document.getElementById('inputSalarioLiquido').value = resultado.liquido.toFixed(2);
    document.getElementById('viewAdiantamento').value = `R$ ${resultado.adiantamento.toFixed(2)}`;
    
    document.getElementById('conteudo-sanfona-calculadora').style.display = 'none';

    window.mostrarToast(`Cálculo de R$ ${resultado.liquido.toFixed(2)} injetado com precisão!`);
};

// ==========================================
// INICIALIZAÇÃO E ROBÔ
// ==========================================
window.carregarTodosOsDados = async () => {
    try {
        window.registros = await carregarDadosSaripan();
        window.registrosModular = await carregarDadosModular();
        
        const snapExtra = await getDocs(collection(db, "renda_extra"));
        window.registrosExtra = snapExtra.docs.map(d => d.data());

        const base = await buscarSalarioBaseConfigurado();
        if (base > 0) {
            localStorage.setItem('modular_salario_base', base);
            if (document.getElementById('configSalarioBase')) document.getElementById('configSalarioBase').value = base;
        }

        const adiantamentoGerado = await verificarGeracaoAdiantamento(base, window.registrosModular);
        if(adiantamentoGerado) window.registrosModular.push(adiantamentoGerado);

        if (window.renderizarApontamentosSaripan) window.renderizarApontamentosSaripan(); 
        if (window.renderizarFinanceiroSaripan) window.renderizarFinanceiroSaripan();
        if (window.preencherFormularioModular) window.preencherFormularioModular();
        if (window.renderizarHistoricoModular) window.renderizarHistoricoModular();
        if (window.renderizarHistoricoExtra) window.renderizarHistoricoExtra();
        if (window.renderizarDashboardGeral) window.renderizarDashboardGeral();

    } catch (e) { console.error("Erro ao carregar dados:", e); }
};

// ==========================================
// MÓDULO MODULAR (Integração)
// ==========================================
window.salvarSalarioBase = async () => {
    const base = parseFloat(document.getElementById('configSalarioBase').value) || 0;
    if (base <= 0) return alert("Digite um valor válido para o Salário Base.");
    await salvarSalarioBaseNoBanco(base);
    localStorage.setItem('modular_salario_base', base);
    window.preencherFormularioModular();
    window.mostrarToast("Salário Base salvo!");
};

window.preencherFormularioModular = () => {
    const mesStr = document.getElementById('mesModular').value;
    if (!mesStr) return;
    const [anoStr, mesStrNum] = mesStr.split('-');
    const idUnico = `MOD-${anoStr}-${parseInt(mesStrNum)}`;
    const reg = window.registrosModular.find(r => r.id === idUnico);
    const salarioBase = parseFloat(localStorage.getItem('modular_salario_base')) || 0;
    const adiantCalculado = salarioBase * 0.40;

    if (reg) {
        document.getElementById('viewAdiantamento').value = `R$ ${(parseFloat(reg.adiantamento) || 0).toFixed(2)}`;
        document.getElementById('inputSalarioLiquido').value = reg.salario > 0 ? reg.salario : '';
        document.getElementById('inputExtras').value = reg.outras > 0 ? reg.outras : '';
        document.getElementById('descExtras').value = reg.nomeOutras || '';
    } else {
        document.getElementById('viewAdiantamento').value = `R$ ${adiantCalculado.toFixed(2)}`;
        document.getElementById('inputSalarioLiquido').value = '';
        document.getElementById('inputExtras').value = '';
        document.getElementById('descExtras').value = '';
    }
};

window.salvarMesModular = async () => {
    const mesStr = document.getElementById('mesModular').value;
    if (!mesStr) return alert("Selecione o mês de referência.");
    const salarioBase = parseFloat(localStorage.getItem('modular_salario_base')) || 0;
    if (salarioBase <= 0) return alert("Configure o Salário Base primeiro!");

    const [anoStr, mesStrNum] = mesStr.split('-');
    const ano = parseInt(anoStr); const mes = parseInt(mesStrNum) - 1;
    const idUnico = `MOD-${ano}-${mes + 1}`;

    const adiantamento = salarioBase * 0.40;
    const salarioLiq = parseFloat(document.getElementById('inputSalarioLiquido').value) || 0;
    const extras = parseFloat(document.getElementById('inputExtras').value) || 0;
    const descExtras = document.getElementById('descExtras').value || '';

    const totalRemunerativo = adiantamento + salarioLiq + extras;
    const totalGeral = totalRemunerativo + BENEFICIOS_FIXOS;

    const novoReg = {
        id: idUnico, ano: ano, mes: mes,
        salarioBase: salarioBase, adiantamento: adiantamento,
        salario: salarioLiq, outras: extras, nomeOutras: descExtras,
        beneficios: BENEFICIOS_FIXOS, totalRemunerativo: totalRemunerativo, totalGeral: totalGeral,
        geradoAutomaticamente: false
    };

    await salvarFechamentoNoBanco(idUnico, novoReg);
    window.registrosModular = window.registrosModular.filter(r => r.id !== idUnico);
    window.registrosModular.push(novoReg);
    window.renderizarHistoricoModular();
    window.renderizarDashboardGeral();
    window.mostrarToast("Fechamento mensal salvo com sucesso!");
};

window.excluirRegistroModular = async (id) => {
    if (!confirm("Excluir este registo do Modular?")) return;
    await excluirFechamentoNoBanco(id);
    window.registrosModular = window.registrosModular.filter(r => r.id !== id);
    window.renderizarHistoricoModular();
    window.renderizarDashboardGeral();
};

window.renderizarHistoricoModular = () => {
    const container = document.getElementById('lista-modular-container');
    if(!container) return; container.innerHTML = "";
    const regs = [...window.registrosModular].sort((a, b) => a.ano !== b.ano ? b.ano - a.ano : b.mes - a.mes);
    if (regs.length === 0) { container.innerHTML = "<p style='text-align:center;'>Sem dados.</p>"; return; }
    let tableHtml = `<div style="overflow-x: auto; background: white; border-radius: 8px; border: 1px solid #cfd8dc;"><table style="width: 100%; min-width: 600px; font-size: 11px; border-collapse: collapse; text-align: center;"><thead><tr style="background: #e3f2fd; border-bottom: 2px solid #90caf9;"><th style="padding: 10px 5px; text-align: left;">Mês/Ano</th><th style="padding: 10px 5px;">Adiant.</th><th style="padding: 10px 5px;">Sal. Líq.</th><th style="padding: 10px 5px; color:#2e7d32;">Benef.</th><th style="padding: 10px 5px;">Extras</th><th style="padding: 10px 5px; background: #bbdefb;">Total Rem.</th><th style="padding: 10px 5px; background: #c8e6c9;">T. Rem + Ben</th><th></th></tr></thead><tbody>`;
    regs.forEach(r => { 
        const adiantamento = parseFloat(r.adiantamento) || 0; const salario = parseFloat(r.salario) || 0; const outras = parseFloat(r.outras) || 0; const beneficios = parseFloat(r.beneficios) || 1225;
        const tr = parseFloat(r.totalRemunerativo) || (adiantamento + salario + outras); const tg = parseFloat(r.totalGeral) || (tr + beneficios);
        tableHtml += `<tr style="border-bottom: 1px solid #eceff1;"><td style="padding: 10px 5px; text-align: left; font-weight: bold; color: #455a64;">${MESES[r.mes]} ${r.ano}</td><td class="esconder-valor" style="padding: 10px 5px;">R$ ${adiantamento.toFixed(2)}</td><td class="esconder-valor" style="padding: 10px 5px;">R$ ${salario.toFixed(2)}</td><td class="esconder-valor" style="padding: 10px 5px; color:#2e7d32; font-style: italic;">R$ ${beneficios.toFixed(2)}</td><td class="esconder-valor" style="padding: 10px 5px;" title="${r.nomeOutras || ''}">R$ ${outras.toFixed(2)}</td><td class="esconder-valor" style="padding: 10px 5px; background: #e3f2fd; font-weight: bold; color: #1565c0;">R$ ${tr.toFixed(2)}</td><td class="esconder-valor" style="padding: 10px 5px; background: #e8f5e9; font-weight: bold; color: #1b5e20;">R$ ${tg.toFixed(2)}</td><td style="padding: 10px 5px;"><span style="color:red; cursor:pointer; font-size:14px;" onclick="window.excluirRegistroModular('${r.id}')">✖</span></td></tr>`; 
    });
    tableHtml += `</tbody></table></div>`; container.innerHTML = tableHtml;
};

// ==========================================
// RENDERIZAÇÃO DA VISÃO GERAL (DASHBOARD)
// ==========================================
window.renderizarDashboardGeral = () => {
    const container = document.getElementById('dashboard-geral-content');
    if(!container) return;
    
    const dadosGerais = {}; 
    let anosEncontrados = new Set();
    
    const initData = (ano, mes) => {
        const k = `${ano}-${mes}`; 
        anosEncontrados.add(ano);
        if(!dadosGerais[k]) dadosGerais[k] = { ano: ano, mes: mes, saripan: 0, modularRem: 0, modularBen: 0, extra: 0 };
        return k;
    };

    window.registros.forEach(r => { const k = initData(r.ano, r.mes); dadosGerais[k].saripan += parseFloat(r.total) || 0; });
    window.registrosModular.forEach(r => { 
        const k = initData(r.ano, r.mes); 
        const rem = parseFloat(r.totalRemunerativo) || parseFloat(r.total) || 0;
        const ben = parseFloat(r.beneficios) || parseFloat(r.totalBeneficios) || 1225;
        dadosGerais[k].modularRem += rem; dadosGerais[k].modularBen += ben; 
    });
    window.registrosExtra.forEach(r => { const k = initData(r.ano, r.mes); dadosGerais[k].extra += parseFloat(r.total) || 0; });

    const anosOrdenados = Array.from(anosEncontrados).sort((a,b) => b-a);
    if(anosOrdenados.length === 0) { container.innerHTML = "<p style='text-align:center;'>Sem dados.</p>"; return; }
    
    let htmlFinal = '';
    
    anosOrdenados.forEach(ano => {
        const mesesDoAno = Object.values(dadosGerais).filter(d => d.ano === ano).sort((a,b) => a.mes - b.mes);
        let totalAcumuladoAno = 0; 
        const labels = [], dataSari = [], dataModRem = [], dataBen = [], dataExtra = [];
        let htmlTabelaCorpo = '';

        mesesDoAno.forEach(m => {
            labels.push(MESES[m.mes].substring(0,3)); 
            dataSari.push(m.saripan); dataModRem.push(m.modularRem); dataBen.push(m.modularBen); dataExtra.push(m.extra);
            const totalMes = m.saripan + m.modularRem + m.modularBen + m.extra;
            totalAcumuladoAno += totalMes;
            htmlTabelaCorpo += `
                <tr>
                    <td style="padding: 8px; font-weight: bold; color: #455a64; text-align: left;">${MESES[m.mes]}</td>
                    <td class="esconder-valor" style="padding: 8px; text-align: right;">R$ ${m.modularRem.toFixed(2)}</td>
                    <td class="esconder-valor" style="padding: 8px; text-align: right;">R$ ${m.modularBen.toFixed(2)}</td>
                    <td class="esconder-valor" style="padding: 8px; text-align: right;">R$ ${m.saripan.toFixed(2)}</td>
                    <td class="esconder-valor" style="padding: 8px; text-align: right;">R$ ${m.extra.toFixed(2)}</td>
                    <td class="esconder-valor" style="padding: 8px; text-align: right; background: #e8f5e9; font-weight: bold; color: #1b5e20;">R$ ${totalMes.toFixed(2)}</td>
                </tr>`;
        });
        
        const media = mesesDoAno.length > 0 ? (totalAcumuladoAno / mesesDoAno.length) : 0;
        
        htmlFinal += `<div style="margin-bottom: 35px;">
            <h4 style="color: #f57c00; border-bottom: 2px solid #ffe0b2; padding-bottom: 5px;">ANÁLISE FINANCEIRA ${ano}</h4>
            <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                <div class="year-summary" style="flex: 1; padding: 10px; border-color: #ffcc80;"><h4>RENDIMENTO TOTAL</h4><div class="year-total-value esconder-valor" style="font-size: 15px; margin-top: 10px; color: #e65100;">${totalAcumuladoAno.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</div></div>
                <div class="year-summary" style="flex: 1; padding: 10px; background: #e3f2fd; border-color: #90caf9;"><h4>MÉDIA MENSAL</h4><div class="year-total-value esconder-valor" style="font-size: 15px; color: #0d47a1; margin-top: 10px;">${media.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</div></div>
            </div>
            <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 15px;"><div style="position: relative; height: 250px; width: 100%;"><canvas id="grafico-geral-${ano}" class="esconder-valor"></canvas></div></div>
            <div style="overflow-x: auto; background: white; border-radius: 8px; border: 1px solid #cfd8dc;">
                <table style="width: 100%; min-width: 550px; font-size: 11px; border-collapse: collapse;">
                    <thead><tr style="background: #e3f2fd; border-bottom: 2px solid #90caf9; text-align: right;"><th style="padding: 10px 8px; text-align: left;">Mês</th><th style="padding: 10px 8px;">Mod. Rem.</th><th style="padding: 10px 8px;">Benefícios</th><th style="padding: 10px 8px;">Saripan</th><th style="padding: 10px 8px;">Extras</th><th style="padding: 10px 8px; background: #c8e6c9; color: #1b5e20;">Total do Mês</th></tr></thead>
                    <tbody>${htmlTabelaCorpo}</tbody>
                </table>
            </div>
        </div>`;

        setTimeout(() => {
            const ctx = document.getElementById(`grafico-geral-${ano}`);
            if(ctx) {
                const chart = new Chart(ctx, { 
                    type: 'bar', data: { labels: labels, datasets: [ 
                        { label: 'Mod (Líquido+Adiant)', data: dataModRem, backgroundColor: '#1565c0' }, { label: 'Mod (Benefícios)', data: dataBen, backgroundColor: '#4dd0e1' }, 
                        { label: 'Saripan', data: dataSari, backgroundColor: '#43a047' }, { label: 'Extras', data: dataExtra, backgroundColor: '#fbc02d' }
                    ]}, options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true } } } 
                });
                if (!window.chartsAtivos) window.chartsAtivos = []; window.chartsAtivos.push(chart);
            }
        }, 100);
    });
    container.innerHTML = htmlFinal;
};

// ==========================================
// OUTROS MÓDULOS (Saripan, Extras)
// ==========================================
window.adicionarRegistro = async () => {
    const dataInput = document.getElementById('dataServico').value;
    if (!dataInput) return alert("Selecione uma data!");
    const base = parseFloat(document.getElementById('valorBase').value);
    const carga = parseInt(document.getElementById('tipoCarga').value);
    const tipoDia = parseInt(document.getElementById('tipoDia').value);
    const p = obterPeriodo(dataInput);
    let multiplicador = (tipoDia === 3 || tipoDia === 2) ? (carga === 2 ? 4 : 2) : carga;
    
    const novoRegistro = { id: Date.now().toString(), data: dataInput, ano: p.ano, mes: p.mes, quinzena: p.quinzena, carga: carga, tipoDia: tipoDia, valorBase: base, multiplicador: multiplicador, total: base * multiplicador };
    await salvarApontamentoNoBanco(novoRegistro);
    window.registros.push(novoRegistro);
    if(window.renderizarApontamentosSaripan) window.renderizarApontamentosSaripan(); 
    if(window.atualizarRodapeDinamico) window.atualizarRodapeDinamico(); 
    if(window.renderizarFinanceiroSaripan) window.renderizarFinanceiroSaripan(); 
    if(window.renderizarDashboardGeral) window.renderizarDashboardGeral();
    window.mostrarToast("Apontamento salvo!");
};

window.excluirRegistro = async (id) => {
    if (!confirm("Deseja realmente excluir este apontamento?")) return;
    await excluirApontamentoNoBanco(id.toString());
    window.registros = window.registros.filter(r => r.id.toString() !== id.toString());
    if(window.renderizarApontamentosSaripan) window.renderizarApontamentosSaripan(); 
    if(window.atualizarRodapeDinamico) window.atualizarRodapeDinamico(); 
    if(window.renderizarFinanceiroSaripan) window.renderizarFinanceiroSaripan(); 
    if(window.renderizarDashboardGeral) window.renderizarDashboardGeral();
};

window.excluirQuinzena = async (chaveGrupo) => {
    if (!confirm("ATENÇÃO: Deseja excluir TODOS os registros desta quinzena?")) return;
    const [anoStr, mesStr, quinzenaStr] = chaveGrupo.split('-');
    const ano = parseInt(anoStr); const mes = parseInt(mesStr); const quinzena = parseInt(quinzenaStr);
    const itensParaExcluir = window.registros.filter(r => r.ano === ano && r.mes === mes && r.quinzena === quinzena);

    await excluirQuinzenaNoBanco(itensParaExcluir);
    window.registros = window.registros.filter(r => !(r.ano === ano && r.mes === mes && r.quinzena === quinzena));
    if(window.renderizarApontamentosSaripan) window.renderizarApontamentosSaripan(); 
    if(window.atualizarRodapeDinamico) window.atualizarRodapeDinamico(); 
    if(window.renderizarFinanceiroSaripan) window.renderizarFinanceiroSaripan(); 
    if(window.renderizarDashboardGeral) window.renderizarDashboardGeral();
    window.mostrarToast("Quinzena excluída!");
};

window.renderizarApontamentosSaripan = () => {
    const container = document.getElementById('lista-quinzenas-container');
    if(!container) return; container.innerHTML = "";
    const msgVazia = document.getElementById('msg-sem-dados');
    if (window.registros.length === 0) { if(msgVazia) msgVazia.style.display = 'block'; return; }
    if(msgVazia) msgVazia.style.display = 'none';

    const grupos = {};
    window.registros.forEach(reg => {
        const chave = `${reg.ano}-${reg.mes}-${reg.quinzena}`;
        if (!grupos[chave]) { grupos[chave] = { ano: reg.ano, mes: reg.mes, quinzena: reg.quinzena, itens: [], totalValor: 0 }; }
        grupos[chave].itens.push(reg); grupos[chave].totalValor += reg.total;
    });

    const chavesOrdenadas = Object.keys(grupos).sort((a, b) => {
        const [anoA, mesA, qA] = a.split('-').map(Number); const [anoB, mesB, qB] = b.split('-').map(Number);
        if (anoA !== anoB) return anoB - anoA; if (mesA !== mesB) return mesB - mesA; return qB - qA;
    });

    chavesOrdenadas.forEach((chave, index) => {
        const grupo = grupos[chave];
        grupo.itens.sort((a, b) => new Date(a.data) - new Date(b.data));
        const isPrimeiro = index === 0; const activeClass = isPrimeiro ? 'active' : ''; const openClass = isPrimeiro ? 'open' : '';
        const totalFormatado = grupo.totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        let htmlRows = '';
        grupo.itens.forEach(item => {
            const [, mes, dia] = item.data.split('-'); const dataFmt = `${dia}/${mes}`;
            const tipoStr = item.carga === 1 ? 'Normal' : 'Dupla';
            const diaStr = item.tipoDia === 1 ? 'Útil' : (item.tipoDia === 2 ? 'Dom' : 'Fer');
            const totalItemFmt = `R$ ${item.total.toFixed(2)}`;
            const diasSemana = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
            const dObj = new Date(item.data + 'T12:00:00'); const diaDaSemana = diasSemana[dObj.getDay()];

            htmlRows += `<tr><td>${dataFmt}</td><td>${diaDaSemana}</td><td>${tipoStr}</td><td>${diaStr}</td><td class="td-valor esconder-valor">${totalItemFmt}</td><td class="td-acao"><span style="color:red; cursor:pointer;" onclick="window.excluirRegistro('${item.id}')">✖</span></td></tr>`;
        });

        const btnPrint = `<button class="btn-icon" style="color:#25D366; font-size: 20px; padding: 5px; margin-right: 5px;" onclick="event.stopPropagation(); window.compartilharRelatorio('${chave}')">🖨️</button>`;
        const btnExcluirGrupo = `<button class="btn-icon" style="color:#d32f2f; font-size:20px; padding:5px;" onclick="event.stopPropagation(); window.excluirQuinzena('${chave}')">🗑️</button>`;

        const div = document.createElement('div');
        div.className = 'accordion-group';
        div.innerHTML = `
            <div class="accordion-header ${activeClass}" onclick="this.classList.toggle('active'); this.nextElementSibling.classList.toggle('open');">
                <div><div class="accordion-title">${grupo.quinzena}ª Quinzena - ${MESES[grupo.mes]} ${grupo.ano}</div><div class="accordion-meta">${grupo.itens.length} registros</div></div>
                <div class="accordion-actions" style="display:flex; align-items:center;">${btnPrint} ${btnExcluirGrupo}</div>
            </div>
            <div class="accordion-content ${openClass}">
                <table><thead><tr><th>Data</th><th>Dia</th><th>Tipo</th><th>Detalhes</th><th style="text-align:right">Valor</th><th></th></tr></thead>
                <tbody>${htmlRows}<tr class="total-row"><td colspan="3">Total</td><td colspan="2" class="td-valor esconder-valor">${totalFormatado}</td><td></td></tr></tbody></table>
            </div>`;
        container.appendChild(div);
    });
};

window.renderizarFinanceiroSaripan = () => {
    const container = document.getElementById('financeiro-content');
    if(!container) return;

    const dadosPorMes = {}; const totaisAnuais = {};

    window.registros.forEach(reg => {
        const chaveMes = `${reg.ano}-${reg.mes}`;
        if (!dadosPorMes[chaveMes]) { dadosPorMes[chaveMes] = { ano: reg.ano, mes: reg.mes, totalQ1: 0, totalQ2: 0 }; }
        if (reg.quinzena === 1) { dadosPorMes[chaveMes].totalQ1 += reg.total; } else { dadosPorMes[chaveMes].totalQ2 += reg.total; }
        if (!totaisAnuais[reg.ano]) totaisAnuais[reg.ano] = 0; totaisAnuais[reg.ano] += reg.total;
    });

    const chavesOrdenadasMes = Object.keys(dadosPorMes).sort((a, b) => {
        const [anoA, mesA] = a.split('-').map(Number); const [anoB, mesB] = b.split('-').map(Number);
        if (anoA !== anoB) return anoB - anoA; return mesB - mesA;
    });

    const anosOrdenados = Object.keys(totaisAnuais).sort((a,b) => b-a);
    if (chavesOrdenadasMes.length === 0) { container.innerHTML = "<p style='text-align:center; padding: 20px; color:#999;'>Sem dados financeiros.</p>"; return; }

    let htmlFinal = '';
    const hoje = new Date(); const anoAtual = hoje.getFullYear(); const mesAtual = hoje.getMonth(); const diaAtual = hoje.getDate();

    anosOrdenados.forEach(anoStr => {
        const ano = parseInt(anoStr); const chavesDesteAno = chavesOrdenadasMes.filter(k => k.startsWith(`${ano}-`));
        let totalAcumuladoDoAno = 0; let totalMesesFechados = 0; let qtdMesesFechados = 0;
        const labels = []; const dadosQ1 = []; const dadosQ2 = []; const dadosTotalMes = [];
        let htmlTabelaCorpo = '';

        chavesDesteAno.forEach(k => {
            const d = dadosPorMes[k]; const totalMes = d.totalQ1 + d.totalQ2;
            totalAcumuladoDoAno += totalMes;
            if (d.ano < anoAtual || (d.ano === anoAtual && d.mes < mesAtual)) { totalMesesFechados += totalMes; qtdMesesFechados++; }
            labels.push(MESES[d.mes].substring(0, 3)); dadosQ1.push(d.totalQ1); dadosQ2.push(d.totalQ2); dadosTotalMes.push(totalMes);

            htmlTabelaCorpo += `<tr><td>${MESES[d.mes]}</td><td style="text-align:right" class="esconder-valor">R$ ${d.totalQ1.toFixed(2)}</td><td style="text-align:right" class="esconder-valor">R$ ${d.totalQ2.toFixed(2)}</td><td style="text-align:right" class="fin-row-total esconder-valor">R$ ${totalMes.toFixed(2)}</td></tr>`;
        });

        const mediaParcialFechada = qtdMesesFechados > 0 ? (totalMesesFechados / qtdMesesFechados) : 0;
        let divisorProporcional = chavesDesteAno.length;
        if (ano === anoAtual) { divisorProporcional = mesAtual + (diaAtual / 30); }
        const mediaTotalProporcional = divisorProporcional > 0 ? (totalAcumuladoDoAno / divisorProporcional) : 0;

        htmlFinal += `<h4 style="margin-top: 10px; color: #555; border-bottom: 2px solid #ddd; padding-bottom: 5px; text-transform: uppercase;">Resumo Saripan ${ano}</h4>
            <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                <div class="year-summary" style="flex: 1; padding: 10px;"><h4>RENDIMENTO ANUAL</h4><div class="year-total-value esconder-valor" style="font-size: 17px; margin-top: 10px;">${totalAcumuladoDoAno.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div></div>
                <div class="year-summary" style="flex: 1.8; padding: 10px; background: #e3f2fd; border-color: #90caf9;"><h4 style="color: #1565c0; font-size: 11px; margin-bottom: 10px;">Média Salarial</h4>
                    <div style="display: flex; justify-content: space-around; font-size: 14px; color: #0d47a1;">
                        <div style="text-align: center;"><span style="font-size: 10px; font-weight: bold;">PARCIAL</span><br><strong class="esconder-valor" style="font-size: 15px;">${mediaParcialFechada.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</strong></div>
                        <div style="width: 1px; background: #bbdefb; margin: 0 5px;"></div>
                        <div style="text-align: center;"><span style="font-size: 10px; font-weight: bold;">TOTAL</span><br><strong class="esconder-valor" style="font-size: 15px;">${mediaTotalProporcional.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</strong></div>
                    </div>
                </div>
            </div>
            <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 15px;">
                <h5 style="margin-bottom: 10px; color: #333; font-size: 12px; text-align: center;">Rendimento Mensal Consolidado</h5>
                <div style="position: relative; height: 200px; width: 100%; margin-bottom: 20px;"><canvas id="grafico-sari-bar-${ano}" class="esconder-valor"></canvas></div>
                <h5 style="margin-bottom: 10px; color: #333; font-size: 12px; text-align: center; border-top: 1px dashed #eee; padding-top: 15px;">Comparativo Quinzenal (Q1 vs Q2)</h5>
                <div style="position: relative; height: 200px; width: 100%;"><canvas id="grafico-sari-line-${ano}" class="esconder-valor"></canvas></div>
            </div>
            <table class="fin-table" style="margin-bottom: 30px;"><thead><tr><th>Mês</th><th style="text-align:right">1ª Q.</th><th style="text-align:right">2ª Q.</th><th style="text-align:right; background:#003c8f; color:white;">Total</th></tr></thead><tbody>${htmlTabelaCorpo}</tbody></table>`;

        setTimeout(() => {
            const ctxBar = document.getElementById(`grafico-sari-bar-${ano}`);
            if (ctxBar) {
                const chartBar = new Chart(ctxBar, { type: 'bar', data: { labels: labels, datasets: [{ label: 'Rendimento Mensal Total', data: dadosTotalMes, backgroundColor: '#1b5e20', borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false } });
                if (!window.chartsAtivos) window.chartsAtivos = []; window.chartsAtivos.push(chartBar);
            }
            const ctxLine = document.getElementById(`grafico-sari-line-${ano}`);
            if (ctxLine) {
                const chartLine = new Chart(ctxLine, { type: 'line', data: { labels: labels, datasets: [{ label: '1ª Quinzena', data: dadosQ1, borderColor: '#81c784', backgroundColor: 'rgba(129, 199, 132, 0.1)', fill: true, tension: 0.4 }, { label: '2ª Quinzena', data: dadosQ2, borderColor: '#2e7d32', backgroundColor: 'rgba(46, 125, 50, 0.1)', fill: true, tension: 0.4 }] }, options: { responsive: true, maintainAspectRatio: false } });
                if (!window.chartsAtivos) window.chartsAtivos = []; window.chartsAtivos.push(chartLine);
            }
        }, 100);
    });
    container.innerHTML = htmlFinal;
};

window.adicionarRegistroExtra = async () => {
    const d = document.getElementById('dataExtra').value;
    const desc = document.getElementById('descExtra').value.trim() || 'Renda Extra';
    const valor = parseFloat(document.getElementById('valorExtra').value);
    
    if (!d || isNaN(valor) || valor <= 0) return alert("Preencha a data e um valor válido.");
    
    const dateObj = new Date(d);
    const p = { ano: dateObj.getUTCFullYear(), mes: dateObj.getUTCMonth() };
    const idUnico = `EXT-${Date.now()}`;
    const novoReg = { id: idUnico, data: d, ano: p.ano, mes: p.mes, descricao: desc, total: valor };
    try {
        await setDoc(doc(db, "renda_extra", idUnico), novoReg);
        window.registrosExtra.push(novoReg);
        if(window.renderizarHistoricoExtra) window.renderizarHistoricoExtra(); 
        if(window.renderizarDashboardGeral) window.renderizarDashboardGeral(); 
        window.mostrarToast("Renda Extra registrada!");
    } catch(e) { console.error(e); }
};

window.excluirRegistroExtra = async (id) => { 
    if (!confirm("Deseja excluir esta Renda Extra?")) return;
    try {
        await deleteDoc(doc(db, "renda_extra", id));
        window.registrosExtra = window.registrosExtra.filter(r => r.id !== id);
        if(window.renderizarHistoricoExtra) window.renderizarHistoricoExtra(); 
        if(window.renderizarDashboardGeral) window.renderizarDashboardGeral();
    } catch(e) { console.error(e); }
};

window.renderizarHistoricoExtra = () => {
    const container = document.getElementById('lista-extra-container');
    if(!container) return; container.innerHTML = "";
    const regs = [...window.registrosExtra].sort((a, b) => new Date(b.data) - new Date(a.data));
    if (regs.length === 0) { container.innerHTML = "<p style='text-align:center; font-size:13px; color:#999;'>Nenhuma renda extra registrada ainda.</p>"; return; }
    
    let htmlRows = regs.map(r => {
        const dataFmt = r.data.split('-').reverse().join('/');
        return `<tr><td style="padding: 10px;">${dataFmt}</td><td style="padding: 10px;">${r.descricao}</td><td class="td-valor esconder-valor" style="color:#f57c00; font-weight:bold; padding: 10px;">R$ ${r.total.toFixed(2)}</td><td style="padding: 10px; text-align:center;"><span style="color:red; cursor:pointer;" onclick="window.excluirRegistroExtra('${r.id}')">✖</span></td></tr>`;
    }).join('');
    container.innerHTML = `<div style="background: white; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;"><table style="width:100%; border-collapse:collapse; font-size: 13px;"><tbody>${htmlRows}</tbody></table></div>`;
};

window.obterPeriodo = obterPeriodo;

window.atualizarPreview = () => {
    const base = parseFloat(document.getElementById('valorBase').value) || 0;
    const carga = parseInt(document.getElementById('tipoCarga').value);
    const tipoDia = parseInt(document.getElementById('tipoDia').value);
    let multiplicador = (tipoDia === 3 || tipoDia === 2) ? (carga === 2 ? 4 : 2) : carga;
    const previewEl = document.getElementById('previewValor');
    if (previewEl) previewEl.value = `R$ ${(base * multiplicador).toFixed(2)}`;
};

window.atualizarRodapeDinamico = () => {
    const dataInput = document.getElementById('dataServico').value;
    if (!dataInput) return;
    const p = window.obterPeriodo(dataInput);
    let qtdDiarias = 0; let totalDinheiro = 0;

    window.registros.forEach(r => { if (r.ano === p.ano && r.mes === p.mes && r.quinzena === p.quinzena) { qtdDiarias += r.multiplicador; totalDinheiro += r.total; } });
    const rodapeQtd = document.getElementById('rodape-qtd'); const rodapeTotal = document.getElementById('rodape-total'); const rodapeRef = document.getElementById('rodape-ref');
    if(rodapeQtd) rodapeQtd.innerText = qtdDiarias;
    if(rodapeTotal) rodapeTotal.innerText = totalDinheiro.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
    if(rodapeRef) rodapeRef.innerText = `Referência: ${p.quinzena}ª Quinz. de ${MESES[p.mes]} ${p.ano}`;
};

// ==========================================
// NAVEGAÇÃO UI E AUTH
// ==========================================
window.mudarAba = (aba) => { document.querySelectorAll('#module-saripan .panel').forEach(p => p.classList.remove('active')); document.querySelectorAll('#module-saripan .tab-btn').forEach(b => b.classList.remove('active')); document.getElementById(`painel-${aba}`)?.classList.add('active'); document.getElementById(`btn-tab-${aba}`)?.classList.add('active'); if (aba === 'financeiro' && window.renderizarFinanceiroSaripan) window.renderizarFinanceiroSaripan(); };
window.abrirModulo = (modulo) => { document.getElementById('tela-hub').classList.add('hidden'); document.getElementById('app').classList.remove('hidden'); document.querySelectorAll('.master-module').forEach(m => m.classList.remove('active')); document.getElementById(`module-${modulo}`)?.classList.add('active'); if (modulo === 'geral' && window.renderizarDashboardGeral) window.renderizarDashboardGeral(); if (modulo === 'modular') { window.preencherFormularioModular(); window.renderizarHistoricoModular(); } };
window.voltarAoHub = () => { document.getElementById('app').classList.add('hidden'); document.getElementById('tela-hub').classList.remove('hidden'); };
window.mostrarToast = (msg) => { const t = document.getElementById('toast'); if(t){ t.innerText = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3000); } };
window.togglePrivacidade = () => { document.body.classList.toggle('modo-privacidade'); localStorage.setItem('saripan_privacidade', document.body.classList.contains('modo-privacidade')); };
window.fazerLogin = async () => { const email = document.getElementById('emailLogin').value; const senha = document.getElementById('senhaLogin').value; if (!email || !senha) return alert("Preencha e-mail e senha."); try { await signInWithEmailAndPassword(auth, email, senha); } catch (e) { alert("Credenciais inválidas."); } };
window.sairApp = async () => { if (confirm("Deseja sair?")) await signOut(auth); };

onAuthStateChanged(auth, (user) => {
    if (user) { document.getElementById('tela-login').classList.add('hidden'); document.getElementById('tela-hub').classList.remove('hidden'); window.carregarTodosOsDados(); } 
    else { document.getElementById('tela-login').classList.remove('hidden'); document.getElementById('tela-hub').classList.add('hidden'); document.getElementById('app').classList.add('hidden'); }
});

window.addEventListener('DOMContentLoaded', () => {
    const privSalva = localStorage.getItem('saripan_privacidade') === 'true';
    if(privSalva) document.body.classList.add('modo-privacidade');
    const hoje = new Date(); const ano = hoje.getFullYear(); const mes = String(hoje.getMonth() + 1).padStart(2, '0'); const dia = String(hoje.getDate()).padStart(2, '0');
    if (document.getElementById('dataServico')) document.getElementById('dataServico').value = `${ano}-${mes}-${dia}`;
    if (document.getElementById('dataExtra')) document.getElementById('dataExtra').value = `${ano}-${mes}-${dia}`;
    if (document.getElementById('mesModular')) document.getElementById('mesModular').value = `${ano}-${mes}`;
    
    ['valorBase', 'tipoCarga', 'tipoDia'].forEach(id => { document.getElementById(id)?.addEventListener('input', window.atualizarPreview); });
    
    // Automação da Calculadora Cirúrgica e Calendário
    document.getElementById('calc-mes-ref')?.addEventListener('change', window.atualizarCalendarioCalculadora);
    document.getElementById('calc-feriados-extras')?.addEventListener('blur', window.atualizarCalendarioCalculadora);
});
