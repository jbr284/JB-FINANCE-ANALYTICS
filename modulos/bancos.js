// === modulos/bancos.js ===
import { db } from './firebase-config.js';
import { collection, getDocs, setDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Variável global para armazenar os bancos
window.listaBancos = [];

// Função para carregar os bancos do Firebase
window.carregarBancos = async () => {
    try {
        const snapBancos = await getDocs(collection(db, "bancos"));
        window.listaBancos = snapBancos.docs.map(doc => doc.data());
        window.renderizarBancos();
        window.atualizarSelectBancos(); // Atualiza o select na Aba 1 (Modular)
    } catch (e) {
        console.error("Erro ao carregar bancos:", e);
    }
};

// Função para adicionar um novo banco
window.adicionarBanco = async () => {
    const nome = document.getElementById('nomeBanco').value.trim();
    const saldoInicial = parseFloat(document.getElementById('saldoInicialBanco').value) || 0;

    if (!nome) return alert("Digite o nome do banco!");

    const idUnico = `BANCO-${Date.now()}`;
    const novoBanco = {
        id: idUnico,
        nome: nome,
        saldoInicial: saldoInicial,
        dataCadastro: new Date().toISOString()
    };

    try {
        await setDoc(doc(db, "bancos", idUnico), novoBanco);
        window.listaBancos.push(novoBanco);
        window.renderizarBancos();
        window.atualizarSelectBancos();
        window.mostrarToast("Banco cadastrado com sucesso!");
        
        // Limpar campos
        document.getElementById('nomeBanco').value = '';
        document.getElementById('saldoInicialBanco').value = '';
    } catch(e) {
        console.error("Erro ao salvar banco:", e);
        alert("Erro ao salvar o banco.");
    }
};

// Função para excluir um banco
window.excluirBanco = async (id) => {
    if (!confirm("Tem a certeza que deseja excluir este banco? Isso pode afetar os seus relatórios se houver transações vinculadas a ele.")) return;
    try {
        await deleteDoc(doc(db, "bancos", id));
        window.listaBancos = window.listaBancos.filter(b => b.id !== id);
        window.renderizarBancos();
        window.atualizarSelectBancos();
        window.mostrarToast("Banco excluído.");
    } catch(e) {
        console.error("Erro ao excluir banco:", e);
    }
};

// Função para desenhar a tabela de bancos na tela
window.renderizarBancos = () => {
    const container = document.getElementById('lista-bancos-container');
    if (!container) return;

    if (window.listaBancos.length === 0) {
        container.innerHTML = "<p style='text-align:center; color:#999; font-size:13px;'>Nenhum banco cadastrado ainda.</p>";
        return;
    }

    let html = `<table><thead><tr><th>Banco</th><th style="text-align:right">Saldo de Implantação</th><th></th></tr></thead><tbody>`;
    
    window.listaBancos.forEach(b => {
        html += `
        <tr>
            <td style="font-weight:bold; color:#455a64;">${b.nome}</td>
            <td class="esconder-valor" style="text-align:right; color:#2e7d32;">R$ ${b.saldoInicial.toFixed(2)}</td>
            <td style="text-align:center;">
                <span style="color:red; cursor:pointer; font-size: 16px;" onclick="window.excluirBanco('${b.id}')">✖</span>
            </td>
        </tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
};

// Função para injetar os bancos no campo de seleção da Aba 1 (Módulo Modular)
window.atualizarSelectBancos = () => {
    const selectModular = document.getElementById('bancoModular');
    if (!selectModular) return;

    if (window.listaBancos.length === 0) {
        selectModular.innerHTML = `<option value="padrao">Aguardando Cadastro de Bancos...</option>`;
        return;
    }

    selectModular.innerHTML = `<option value="">Selecione o Banco...</option>`;
    window.listaBancos.forEach(b => {
        selectModular.innerHTML += `<option value="${b.id}">${b.nome}</option>`;
    });
};
