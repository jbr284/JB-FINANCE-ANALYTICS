// === app.js (O Orquestrador) ===
import { auth } from './modulos/firebase-config.js';
import { togglePrivacidade, mostrarToast, definirDatasAtuais } from './modulos/ui.js';
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Exportando funções para o HTML (window)
window.togglePrivacidade = togglePrivacidade;

// Controle de Autenticação
auth.onAuthStateChanged((user) => {
    if (user) {
        document.getElementById('tela-login').classList.add('hidden');
        document.getElementById('tela-hub').classList.remove('hidden');
        document.getElementById('app').classList.add('hidden');
        
        // Aqui chamaremos a função para carregar dados (implementada nos próximos passos)
        console.log("Usuário logado. Preparando carregamento modular...");
    } else {
        document.getElementById('tela-login').classList.remove('hidden');
        document.getElementById('tela-hub').classList.add('hidden');
        document.getElementById('app').classList.add('hidden');
    }
});

window.fazerLogin = async () => {
    const email = document.getElementById('emailLogin').value;
    const senha = document.getElementById('senhaLogin').value;
    if (!email || !senha) return alert("Preencha e-mail e senha.");
    const btn = document.querySelector('#tela-login .btn-action');
    btn.innerText = "Entrando...";
    try { await signInWithEmailAndPassword(auth, email, senha); } 
    catch (e) { alert("Credenciais inválidas."); } 
    finally { btn.innerText = "Entrar"; }
};

window.sairApp = async () => { if (confirm("Deseja sair?")) await signOut(auth); };

// Inicialização de UI
window.addEventListener('DOMContentLoaded', () => {
    const privSalva = localStorage.getItem('saripan_privacidade') === 'true';
    if(privSalva) document.body.classList.add('modo-privacidade');
    definirDatasAtuais();
    
    // O Service Worker continua aqui para manter o PWA funcionando
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
});
