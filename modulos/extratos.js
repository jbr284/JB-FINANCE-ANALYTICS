// === modulos/extratos.js ===

const CATEGORIAS_PADRAO = [
    "Outros",
    "Supermercado",
    "Açougue",
    "Fastfood",
    "Posto de Combustível",
    "Lazer",
    "Doações",
    "Contas de Consumo",
    "Educação"
];

// O Robô de Processamento
window.processarCSV = () => {
    const bancoSelecionado = document.getElementById('bancoExtratoUpload').value;
    const fileInput = document.getElementById('arquivoCSV');

    if (!bancoSelecionado) return alert("Por favor, selecione para qual banco este extrato pertence.");
    if (!fileInput.files.length) return alert("Por favor, selecione um arquivo CSV do seu banco.");

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
        const text = e.target.result;
        analisarLinhasCSV(text, bancoSelecionado);
    };

    // Lê o arquivo (ISO-8859-1 previne que os acentos do Bradesco fiquem desconfigurados)
    reader.readAsText(file, 'ISO-8859-1');
};

// O Novo Cérebro Analítico (Inteligência "Data-First" à prova de Bradesco)
function analisarLinhasCSV(textoCSV, idBanco) {
    const linhas = textoCSV.split('\n');
    let transacoesExtraidas = [];
    
    // Descobre se o banco usa ponto-e-vírgula (Bradesco/Itaú) ou vírgula (Nubank)
    const separador = textoCSV.includes(';') ? ';' : ',';
    
    // Expressão regular que caça padrões de data no início (DD/MM)
    const regexData = /^\d{2}\/\d{2}/;

    // Função de Raio-X numérico (converte strings PT-BR para matemática do sistema)
    const parseValor = (str) => {
        if (!str) return NaN;
        let limpa = str.trim();
        if (limpa === "") return NaN;
        
        // Se tiver R$ solto, limpa
        limpa = limpa.replace('R$', '').trim();

        if (limpa.includes(',') && limpa.includes('.')) {
            limpa = limpa.replace(/\./g, '').replace(',', '.'); // Ex: 1.500,00 -> 1500.00
        } else if (limpa.includes(',')) {
            limpa = limpa.replace(',', '.'); // Ex: 50,00 -> 50.00
        }
        return parseFloat(limpa);
    };

    for (let i = 0; i < linhas.length; i++) {
        let linha = linhas[i].trim();
        if (!linha) continue;

        const colunas = linha.split(separador).map(c => c.replace(/"/g, '').trim());
        
        // SEGREDO DE MESTRE: Só processa a linha se ela começar com uma Data!
        // Isso ignora instantaneamente falsos cabeçalhos, rodapés e metadados.
        if (!regexData.test(colunas[0])) continue;

        const dataStr = colunas[0];
        let descricao = "Sem descrição";
        let valorCalculado = 0;

        // Limpeza de Saldos e Lixo Bancário
        if (colunas.some(c => c.toUpperCase().includes('SALDO') || c.toUpperCase().includes('TOTAL'))) {
            // Se a descrição for literalmente um aviso de saldo, pulamos.
            if (colunas[1] && (colunas[1].toUpperCase().includes('SALDO') || colunas[1].toUpperCase().includes('TOTAL'))) {
                continue;
            }
        }

        // --- DETECÇÃO INTELIGENTE DA ESTRUTURA DO BANCO ---

        // 1. Padrão Nubank (Data, Valor, Identificador, Descrição)
        if (colunas.length === 4 && !isNaN(parseValor(colunas[1])) && isNaN(parseValor(colunas[3]))) {
            valorCalculado = parseValor(colunas[1]);
            descricao = colunas[3];
        }
        // 2. Padrão Bradesco Clássico (Data, Histórico, Docto, Crédito, Débito, Saldo)
        else if (colunas.length >= 5) {
            descricao = colunas[1] || 'Sem descrição';
            
            // O Bradesco isola Créditos e Débitos nas colunas 3 e 4
            let cred = parseValor(colunas[3]);
            let deb = parseValor(colunas[4]);
            
            if (!isNaN(cred) && cred !== 0) valorCalculado = Math.abs(cred);
            else if (!isNaN(deb) && deb !== 0) valorCalculado = -Math.abs(deb);
        }
        // 3. Padrão Inter / Itaú Moderno (Data, Descrição, Valor, Saldo)
        else if (colunas.length >= 3 && !isNaN(parseValor(colunas[2]))) {
            descricao = colunas[1] || 'Sem descrição';
            valorCalculado = parseValor(colunas[2]);
        }

        // --- REGISTRO DA TRANSAÇÃO ---
        if (valorCalculado !== 0 && !isNaN(valorCalculado)) {
            transacoesExtraidas.push({
                data: dataStr,
                descricao: descricao,
                valor: valorCalculado,
                tipo: valorCalculado < 0 ? 'debito' : 'credito',
                idBanco: idBanco
            });
        }
    }

    renderizarTabelaConciliacao(transacoesExtraidas);
}

// A Interface Homem-Máquina (Desenha na Tela para o Usuário)
function renderizarTabelaConciliacao(transacoes) {
    const container = document.getElementById('tabela-conciliacao-container');
    
    if (transacoes.length === 0) {
        container.innerHTML = `<p style="color: red; text-align: center; font-weight: bold; background: #ffebee; padding: 15px; border-radius: 8px;">Nenhuma transação válida encontrada. Verifique se o arquivo tem movimentos no período.</p>`;
        return;
    }

    let html = `
        <h4 style="color:#002f6c; margin-bottom: 10px; margin-top: 20px;">Pré-visualização do Extrato</h4>
        <p style="font-size: 12px; color: #666; margin-bottom: 15px;">Os <b>Créditos</b> serão conciliados com a Aba 1. Classifique os seus <b>Débitos</b> abaixo.</p>
        <div style="background: white; border: 1px solid #cfd8dc; border-radius: 8px; overflow: hidden;">
        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
            <thead>
                <tr style="background: #eceff1; border-bottom: 2px solid #b0bec5;">
                    <th style="padding: 10px 5px; text-align: left;">Data</th>
                    <th style="padding: 10px 5px; text-align: left;">Descrição Original</th>
                    <th style="padding: 10px 5px; text-align:right">Valor</th>
                    <th style="padding: 10px 5px; text-align:center;">Categoria (Aprendizado)</th>
                </tr>
            </thead>
            <tbody>
    `;

    let selectCategorias = `<select class="select-categoria" style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid #b0bec5; background: #fafafa;">`;
    CATEGORIAS_PADRAO.forEach(cat => {
        selectCategorias += `<option value="${cat}">${cat}</option>`;
    });
    selectCategorias += `</select>`;

    transacoes.forEach((t, index) => {
        const corValor = t.tipo === 'debito' ? '#d32f2f' : '#2e7d32'; 
        const iconTipo = t.tipo === 'debito' ? '🔻' : '🟢';
        
        html += `
            <tr style="border-bottom: 1px solid #eceff1;">
                <td style="padding: 12px 5px; color: #455a64;">${t.data}</td>
                <td style="padding: 12px 5px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #37474f;" title="${t.descricao}">
                    ${t.descricao}
                </td>
                <td style="padding: 12px 5px; text-align:right; font-weight: bold; color: ${corValor}; white-space: nowrap;">
                    ${iconTipo} R$ ${Math.abs(t.valor).toFixed(2)}
                </td>
                <td style="padding: 8px 5px; text-align:center;">
                    ${t.tipo === 'debito' ? selectCategorias : '<span style="color:#78909c; font-size: 11px; font-weight: bold;">(Entrada/Conciliação)</span>'}
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
        </div>
        <button class="btn-action btn-green" style="margin-top: 20px; font-size: 16px; padding: 15px;" onclick="alert('Salvar no Firebase: Funcionalidade em construção no próximo passo!')">💾 Salvar e Conciliar Despesas</button>
    `;

    container.innerHTML = html;
    window.mostrarToast("Extrato lido com sucesso pela nova Inteligência!");
}

window.atualizarSelectBancosUpload = () => {
    const selectUpload = document.getElementById('bancoExtratoUpload');
    if (!selectUpload) return;

    if (window.listaBancos.length === 0) {
        selectUpload.innerHTML = `<option value="">Aguardando Cadastro de Bancos...</option>`;
        return;
    }

    selectUpload.innerHTML = `<option value="">Selecione a Conta do Extrato...</option>`;
    window.listaBancos.forEach(b => {
        selectUpload.innerHTML += `<option value="${b.id}">${b.nome}</option>`;
    });
};
