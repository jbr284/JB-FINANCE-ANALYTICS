// === modulos/ui.js ===

window.registros = []; 
window.registrosModular = []; 
window.registrosExtra = []; 
window.chartsAtivos = []; 
export const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const iconeOlhoAberto = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
const iconeOlhoFechado = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

window.togglePrivacidade = () => {
    const isHidden = document.body.classList.toggle('modo-privacidade');
    localStorage.setItem('saripan_privacidade', isHidden);
    document.getElementById('btn-privacidade').innerHTML = isHidden ? iconeOlhoFechado : iconeOlhoAberto;
};

window.mostrarToast = (mensagem = "✅ Operação realizada com sucesso!") => {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.innerText = mensagem;
    toast.className = "show";
    setTimeout(() => toast.className = toast.className.replace("show", ""), 2900);
};

window.abrirModulo = (modulo) => {
    const telaHub = document.getElementById('tela-hub');
    const appContainer = document.getElementById('app');
    
    if (telaHub) telaHub.classList.add('hidden');
    if (appContainer) appContainer.classList.remove('hidden');
    
    const titulos = { 
        'saripan': 'SARIPAN', 
        'modular': 'MODULAR', 
        'geral': 'VISÃO GERAL', 
        'bancos': 'BANCOS E EXTRATOS', 
        'relatorios': 'RELATÓRIOS CONSOLIDADOS' 
    };
    
    const titleEl = document.getElementById('app-title');
    if (titleEl) titleEl.innerText = titulos[modulo] || 'JB Finance Analytics';
    
    document.querySelectorAll('.master-module').forEach(m => m.classList.remove('active'));
    const moduleEl = document.getElementById(`module-${modulo}`);
    if (moduleEl) moduleEl.classList.add('active');
    
    // Dispara a renderização dos dados consoante a aba aberta
    if (modulo === 'saripan' && window.mudarAba) { window.mudarAba('registrar'); window.atualizarRodapeDinamico(); }
    if (modulo === 'modular' && window.renderizarHistoricoModular) window.renderizarHistoricoModular();
    if (modulo === 'geral' && window.renderizarHistoricoExtra) { window.renderizarHistoricoExtra(); window.renderizarDashboardGeral(); }
};

window.voltarAoHub = () => {
    const appContainer = document.getElementById('app');
    const telaHub = document.getElementById('tela-hub');
    if (appContainer) appContainer.classList.add('hidden');
    if (telaHub) telaHub.classList.remove('hidden');
};

window.mudarAba = (aba) => { 
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    
    const btnTab = document.getElementById(`btn-tab-${aba}`);
    const painel = document.getElementById(`painel-${aba}`);
    
    if (btnTab) btnTab.classList.add('active');
    if (painel) painel.classList.add('active');
    
    if (aba === 'financeiro' && window.renderizarFinanceiroSaripan) window.renderizarFinanceiroSaripan(); 
};

window.definirDatasAtuais = () => {
    const d = new Date();
    const ano = d.getFullYear(), mes = String(d.getMonth() + 1).padStart(2, '0'), dia = String(d.getDate()).padStart(2, '0');
    if(document.getElementById('dataServico')) document.getElementById('dataServico').value = `${ano}-${mes}-${dia}`;
    if(document.getElementById('mesModular')) document.getElementById('mesModular').value = `${ano}-${mes}`;
    if(document.getElementById('dataExtra')) document.getElementById('dataExtra').value = `${ano}-${mes}-${dia}`;
};
