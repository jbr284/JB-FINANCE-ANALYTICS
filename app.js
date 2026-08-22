// === app.js (O Orquestrador) ===
import { auth } from './modulos/firebase-config.js';
import './modulos/ui.js';       // Carrega UI e variáveis globais
import './modulos/receitas.js'; // Carrega as regras de negócio das receitas
import './modulos/bancos.js';   // Carrega a lógica de cadastro de contas
import './modulos/extratos.js'; // Carrega o robô de leitura de CSV
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Controle de Autenticação Global
window.fazerLogin = async () => {
    const email = document.getElementById('emailLogin').value;
    const senha = document.getElementById('senhaLogin').value;
    if (!email || !senha) return alert("Preencha e-mail e senha.");
    const btn = document.querySelector('#tela-login .btn-action');
    btn.innerText = "Entrando...";
    try { 
        await signInWithEmailAndPassword(auth, email, senha); 
    } catch (e) { 
        alert("Credenciais inválidas."); 
    } finally { 
        btn.innerText = "Entrar"; 
    }
};

window.sairApp = async () => { 
    if (confirm("Deseja sair?")) await signOut(auth); 
};

// Escuta de Estado de Login
auth.onAuthStateChanged((user) => {
    if (user) {
        document.getElementById('tela-login').classList.add('hidden');
        document.getElementById('tela-hub').classList.remove('hidden');
        document.getElementById('app').classList.add('hidden');
        
        // Dispara o carregamento das Receitas
        if (window.carregarTodosOsDados) {
            window.carregarTodosOsDados();
        }
        
        // Dispara o carregamento dos Bancos
        if (window.carregarBancos) {
            window.carregarBancos();
            setTimeout(() => {
                if (window.atualizarSelectBancosUpload) window.atualizarSelectBancosUpload();
            }, 500);
        }
    } else {
        document.getElementById('tela-login').classList.remove('hidden');
        document.getElementById('tela-hub').classList.add('hidden');
        document.getElementById('app').classList.add('hidden');
    }
});

// Inicialização de Componentes UI
window.addEventListener('DOMContentLoaded', () => {
    const privSalva = localStorage.getItem('saripan_privacidade') === 'true';
    if(privSalva) document.body.classList.add('modo-privacidade');
    
    if (window.definirDatasAtuais) window.definirDatasAtuais();
    
    // Pré-carrega Salário Base da memória imediatamente
    const baseSalva = localStorage.getItem('modular_salario_base');
    if (baseSalva) {
        const elBase = document.getElementById('valorSalarioBase');
        if (elBase) elBase.value = baseSalva;
        if (window.atualizarPreviewModular) window.atualizarPreviewModular();
    }

    // Listeners do Saripan
    ['valorBase', 'tipoCarga', 'tipoDia'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', window.atualizarPreview);
    });
    if (window.atualizarPreview) window.atualizarPreview();

    // Listener da Modular (Para atualizar os 40% auto)
    document.getElementById('valorSalarioBase')?.addEventListener('input', window.atualizarPreviewModular);
    
    // Service Worker PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log("SW Fail: ", err));
    }
});
