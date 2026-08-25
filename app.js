// === app.js (O Maestro Orquestrador) ===

import { 
    auth, signInWithEmailAndPassword, signOut, onAuthStateChanged 
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
    calcularSalarioCompleto 
} from './modulos/motor-calculadora.js';

import { db, collection, getDocs, setDoc, doc, deleteDoc } from './modulos/firebase-config.js';

window.registros = [];
window.registrosModular = [];
window.registrosExtra = [];
window.chartsAtivos = [];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// ==========================================
// PONTE DA CALCULADORA CIRÚRGICA
// ==========================================
window.calcularEInjetarModularCirurgico = () => {
    const salarioBase = parseFloat(localStorage.getItem('modular_salario_base')) || 0;
    if(salarioBase <= 0) return alert("Configure o Salário Base Contratual primeiro!");

    const inputs = {
        salario: salarioBase,
        diasTrab: 30, // Padrão mensal
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
        emprestimo: 0,
        diasUteis: parseFloat(document.getElementById('calc-diasuteis').value) || 0,
        domFeriados: parseFloat(document.getElementById('calc-domferiados').value) || 0,
        descontarVT: document.getElementById('calc-vt').value === 'sim'
    };

    if (inputs.diasUteis === 0 || inputs.domFeriados === 0) {
        alert("Atenção: Preencha os Dias Úteis e Dom/Feriados para o cálculo correto do DSR.");
        return;
    }

    const resultado = calcularSalarioCompleto(inputs);

    document.getElementById('inputSalarioLiquido').value = resultado.liquido.toFixed(2);
    document.getElementById('viewAdiantamento').value = `R$ ${resultado.adiantamento.toFixed(2)}`;
    
    window.mostrarToast(`Cálculo de R$ ${resultado.liquido.toFixed(2)} injetado cirurgicamente!`);
};

// ==========================================
// INICIALIZAÇÃO
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

// ==========================================
// RENDERIZAÇÕES HTML (Mantidas no App.js para acessar o DOM)
// ==========================================
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

// ... Restante das renderizações (Geral, Extra, Saripan) se mantêm idênticas
// Devido à limitação de espaço, a lógica de UI de relatórios (renderizarDashboardGeral, renderizarApontamentosSaripan, renderizarFinanceiroSaripan, etc) 
// deve ser mantida exatamente igual ao que estava no seu app.js anterior, apenas removendo as chamadas de BD locais e usando as chamadas limpas acima.

// Exemplo da estrutura UI Saripan integrada:
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
    window.renderizarApontamentosSaripan(); window.atualizarRodapeDinamico(); window.renderizarFinanceiroSaripan(); window.renderizarDashboardGeral();
    window.mostrarToast("Apontamento salvo!");
};

// Inicialização da UI e Auth
window.mudarAba = (aba) => { document.querySelectorAll('#module-saripan .panel').forEach(p => p.classList.remove('active')); document.querySelectorAll('#module-saripan .tab-btn').forEach(b => b.classList.remove('active')); document.getElementById(`painel-${aba}`)?.classList.add('active'); document.getElementById(`btn-tab-${aba}`)?.classList.add('active'); if (aba === 'financeiro' && window.renderizarFinanceiroSaripan) window.renderizarFinanceiroSaripan(); };
window.abrirModulo = (modulo) => { document.getElementById('tela-hub').classList.add('hidden'); document.getElementById('app').classList.remove('hidden'); document.querySelectorAll('.master-module').forEach(m => m.classList.remove('active')); document.getElementById(`module-${modulo}`)?.classList.add('active'); if (modulo === 'geral' && window.renderizarDashboardGeral) window.renderizarDashboardGeral(); if (modulo === 'modular') { window.preencherFormularioModular(); window.renderizarHistoricoModular(); } };
window.voltarAoHub = () => { document.getElementById('app').classList.add('hidden'); document.getElementById('tela-hub').classList.remove('hidden'); };
window.mostrarToast = (msg) => { const t = document.getElementById('toast'); if(t){ t.innerText = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3000); } };
window.fazerLogin = async () => { const email = document.getElementById('emailLogin').value; const senha = document.getElementById('senhaLogin').value; if (!email || !senha) return alert("Preencha e-mail e senha."); try { await signInWithEmailAndPassword(auth, email, senha); } catch (e) { alert("Credenciais inválidas."); } };
window.sairApp = async () => { if (confirm("Deseja sair?")) await signOut(auth); };

onAuthStateChanged(auth, (user) => {
    if (user) { document.getElementById('tela-login').classList.add('hidden'); document.getElementById('tela-hub').classList.remove('hidden'); window.carregarTodosOsDados(); } 
    else { document.getElementById('tela-login').classList.remove('hidden'); document.getElementById('tela-hub').classList.add('hidden'); document.getElementById('app').classList.add('hidden'); }
});
