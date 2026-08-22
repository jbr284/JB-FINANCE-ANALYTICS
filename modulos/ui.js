// === modulos/ui.js ===

export const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

window.mudarAba = (aba) => {
    document.querySelectorAll('#module-saripan .panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('#module-saripan .tab-btn').forEach(b => b.classList.remove('active'));
    
    const panel = document.getElementById(`painel-${aba}`);
    const btn = document.getElementById(`btn-tab-${aba}`);
    if (panel) panel.classList.add('active');
    if (btn) btn.classList.add('active');
    
    if (aba === 'financeiro' && window.renderizarFinanceiroSaripan) {
        window.renderizarFinanceiroSaripan();
    }
};

window.abrirModulo = (modulo) => {
    document.getElementById('tela-hub').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.querySelectorAll('.master-module').forEach(m => m.classList.remove('active'));
    
    const modEl = document.getElementById(`module-${modulo}`);
    if (modEl) modEl.classList.add('active');
    
    const titulos = {
        'saripan': 'Módulo SARIPAN',
        'modular': 'Módulo MODULAR',
        'geral': 'Visão Geral (Entradas)',
        'bancos': 'Bancos e Extratos',
        'relatorios': 'Relatórios Consolidados'
    };
    document.getElementById('app-title').innerText = titulos[modulo] || 'JB Finance Analytics';

    if (modulo === 'relatorios' && window.renderizarRelatoriosConsolidados) {
        window.renderizarRelatoriosConsolidados();
    }
    if (modulo === 'geral' && window.renderizarDashboardGeral) {
        window.renderizarDashboardGeral();
    }
    if (modulo === 'modular' && window.renderizarHistoricoModular) {
        window.renderizarHistoricoModular();
    }
    if (modulo === 'saripan' && window.renderizarApontamentosSaripan) {
        window.renderizarApontamentosSaripan();
    }
};

window.voltarAoHub = () => {
    document.getElementById('app').classList.add('hidden');
    document.getElementById('tela-hub').classList.remove('hidden');
};

window.togglePrivacidade = () => {
    document.body.classList.toggle('modo-privacidade');
    const estaAtivo = document.body.classList.contains('modo-privacidade');
    localStorage.setItem('saripan_privacidade', estaAtivo);
};

window.mostrarToast = (msg) => {
    const t = document.getElementById('toast');
    if (!t) return;
    t.innerText = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
};

window.definirDatasAtuais = () => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    
    const inputData = document.getElementById('dataServico');
    if (inputData && !inputData.value) inputData.value = `${ano}-${mes}-${dia}`;

    const inputExtra = document.getElementById('dataExtra');
    if (inputExtra && !inputExtra.value) inputExtra.value = `${ano}-${mes}-${dia}`;
    
    const inputMes = document.getElementById('mesModular');
    if (inputMes && !inputMes.value) inputMes.value = `${ano}-${mes}`;
};
