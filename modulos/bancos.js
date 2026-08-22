// === modulos/bancos.js ===
import { db } from './firebase-config.js';
import { collection, getDocs, setDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

window.listaBancos = [];

window.carregarBancos = async () => {
    try {
        const snapBancos = await getDocs(collection(db, "bancos"));
        window.listaBancos = snapBancos.docs.map(doc => doc.data());
        window.renderizarBancos();
        window.atualizarSelectBancos(); 
    } catch (e) {
        console.error("Erro ao carregar bancos:", e);
    }
};

window.adicionarBanco = async () => {
    const nome = document.getElementById('nomeBanco').value.trim();
    const saldoInicial = parseFloat(document.getElementById('saldoInicialBanco').value) || 0;

    if (!nome) return alert("Digite o nome da Conta ou Cartão!");

    const idUnico = `BANCO-${Date.now()}`;
    const novoBanco = { id: idUnico, nome: nome, saldoInicial: saldoInicial, dataCadastro: new Date().toISOString() };

    try {
        await setDoc(doc(db, "bancos", idUnico), novoBanco);
        window.listaBancos.push(novoBanco);
        window.renderizarBancos();
        window.atualizarSelectBancos();
        window.mostrarToast("Conta cadastrada com sucesso!");
        
        document.getElementById('nomeBanco').value = '';
        document.getElementById('saldoInicialBanco').value = '';
    } catch(e) { console.error("Erro ao salvar banco:", e); }
};

window.excluirBanco = async (id) => {
    if (!confirm("Tem a certeza? Isso afeta relatórios vinculados.")) return;
    try {
        await deleteDoc(doc(db, "bancos", id));
        window.listaBancos = window.listaBancos.filter(b => b.id !== id);
        window.renderizarBancos();
        window.atualizarSelectBancos();
        window.mostrarToast("Conta excluída.");
    } catch(e) { console.error(e); }
};

window.renderizarBancos = () => {
    const container = document.getElementById('lista-bancos-container');
    if (!container) return;
    if (window.listaBancos.length === 0) {
        container.innerHTML = "<p style='text-align:center; color:#999; font-size:13px;'>Nenhuma conta cadastrada.</p>";
        return;
    }
    let html = `<table><thead><tr><th>Banco/Cartão</th><th style="text-align:right">Saldo de Implantação</th><th></th></tr></thead><tbody>`;
    window.listaBancos.forEach(b => {
        html += `<tr><td style="font-weight:bold; color:#455a64;">${b.nome}</td><td class="esconder-valor" style="text-align:right; color:#2e7d32;">R$ ${b.saldoInicial.toFixed(2)}</td><td style="text-align:center;"><span style="color:red; cursor:pointer; font-size: 16px;" onclick="window.excluirBanco('${b.id}')">✖</span></td></tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
};

// Agora popula TODOS os selects espalhados pelo sistema sem perder o que já estava escolhido
window.atualizarSelectBancos = () => {
    const selectsParaAtualizar = ['bancoSaripan', 'bancoModular', 'bancoFlash', 'bancoMercadoPago', 'bancoExtra', 'bancoExtratoUpload'];
    
    const baseOption = window.listaBancos.length === 0 
        ? `<option value="">Aguardando Cadastro...</option>` 
        : `<option value="">Selecione o Banco...</option>`;
        
    let optionsHtml = baseOption;
    window.listaBancos.forEach(b => { optionsHtml += `<option value="${b.id}">${b.nome}</option>`; });

    selectsParaAtualizar.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const valorAtual = el.value; // Guarda a escolha anterior
            el.innerHTML = optionsHtml;
            if (valorAtual) el.value = valorAtual; // Restaura a escolha
        }
    });
};
