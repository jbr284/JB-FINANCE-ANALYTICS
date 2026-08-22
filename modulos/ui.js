// === modulos/ui.js ===

// Variáveis Globais (Gerenciamento de Estado)
window.registros = []; 
window.registrosModular = []; 
window.registrosExtra = []; 
window.chartsAtivos = []; 
export const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const iconeOlhoAberto = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
const iconeOlhoFechado = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

export function togglePrivacidade() {
    const isHidden = document.body.classList.toggle('modo-privacidade');
    localStorage.setItem('saripan_privacidade', isHidden);
    document.getElementById('btn-privacidade').innerHTML = isHidden ? iconeOlhoFechado : iconeOlhoAberto;
}

export function mostrarToast(mensagem = "✅ Operação realizada com sucesso!") {
    const toast = document.getElementById("toast");
    toast.innerText = mensagem;
    toast.className = "show";
    setTimeout(() => toast.className = toast.className.replace("show", ""), 2900);
}

export function definirDatasAtuais() {
    const d = new Date();
    const ano = d.getFullYear(), mes = String(d.getMonth() + 1).padStart(2, '0'), dia = String(d.getDate()).padStart(2, '0');
    if(document.getElementById('dataServico')) document.getElementById('dataServico').value = `${ano}-${mes}-${dia}`;
    if(document.getElementById('mesModular')) document.getElementById('mesModular').value = `${ano}-${mes}`;
    if(document.getElementById('dataExtra')) document.getElementById('dataExtra').value = `${ano}-${mes}-${dia}`;
}
