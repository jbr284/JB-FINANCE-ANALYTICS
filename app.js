// === app.js (O Orquestrador) ===
import { auth } from './modulos/firebase-config.js';
import './modulos/ui.js';       
import './modulos/receitas.js'; 
import './modulos/bancos.js';   
import './modulos/extratos.js'; 
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

auth.onAuthStateChanged((user) => {
    if (user) {
        document.getElementById('tela-login').classList.add('hidden');
        document.getElementById('tela-hub').classList.remove('hidden');
        document.getElementById('app').classList.add('hidden');
        
        if (window.carregarTodosOsDados) window.carregarTodosOsDados();
        if (window.carregarBancos) window.carregarBancos();
        if (window.carregarLancamentosExtratos) window.carregarLancamentosExtratos();
    } else {
        document.getElementById('tela-login').classList.remove('hidden');
        document.getElementById('tela-hub').classList.add('hidden');
        document.getElementById('app').classList.add('hidden');
    }
});

window.addEventListener('DOMContentLoaded', () => {
    const privSalva = localStorage.getItem('saripan_privacidade') === 'true';
    if(privSalva) document.body.classList.add('modo-privacidade');
    
    if (window.definirDatasAtuais) window.definirDatasAtuais();
    
    ['valorBase', 'tipoCarga', 'tipoDia'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', window.atualizarPreview);
    });
    if (window.atualizarPreview) window.atualizarPreview();

    document.getElementById('valorSalarioBase')?.addEventListener('input', window.atualizarPreviewModular);
    
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(e => console.log("SW Fail", e));
});
