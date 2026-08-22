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

    if (!bancoSelecionado) {
        return alert("Por favor, selecione para qual banco este extrato pertence.");
    }
    
    if (!fileInput.files.length) {
        return alert("Por favor, selecione um arquivo CSV do seu banco.");
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    // Quando o robô terminar de ler o arquivo
    reader.onload = (e) => {
        const text = e.target.result;
        analisarLinhasCSV(text, bancoSelecionado);
    };

    // Lê o arquivo (O Bradesco usa codificação Latin1/ISO-8859-1 que pode quebrar acentos, o navegador tenta ajustar)
    reader.readAsText(file, 'ISO-8859-1');
};

// O Novo Cérebro Analítico (Robô Universal Bradesco/Itaú/Nubank)
function analisarLinhasCSV(textoCSV, idBanco) {
    const linhas = textoCSV.split('\n');
    let transacoesExtraidas = [];
    
    let indexData = -1, indexDesc = -1, indexValor = -1, indexCredito = -1, indexDebito = -1;
    let dadosIniciaram = false;

    for (let i = 0; i < linhas.length; i++) {
        let linha = linhas[i].trim();
        if (!linha) continue;

        // Separa por ponto-e-vírgula ou vírgula e limpa aspas duplas
        const colunas = linha.split(/;|,/).map(c => c.replace(/"/g, '').trim());
        
        // 1. FASE DE MAPEAMENTO: Procura onde a tabela real começa
        if (!dadosIniciaram) {
            // Converte para maiúsculas para facilitar a busca (ignorando acentos)
            const linhaUpper = colunas.map(c => c.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
            
            if (linhaUpper.includes('DATA')) {
                indexData = linhaUpper.indexOf('DATA');
                // Procura a coluna de descrição
                indexDesc = linhaUpper.findIndex(c => c.includes('HISTORICO') || c.includes('DESCRICAO') || c.includes('LANCAMENTO'));
                
                // Mapeamento Bradesco / Bancos Tradicionais (Colunas Separadas)
                indexCredito = linhaUpper.findIndex(c => c === 'CREDITO');
                indexDebito = linhaUpper.findIndex(c => c === 'DEBITO');
                
                // Mapeamento Bancos Digitais (Coluna Única)
                indexValor = linhaUpper.findIndex(c => c === 'VALOR' || c === 'VALOR (R$)');
                
                dadosIniciaram = true;
            }
            continue; // Pula a própria linha de cabeçalho
        }

        // 2. FASE DE EXTRAÇÃO: Lê as linhas de acordo com o mapeamento
        if (dadosIniciaram && colunas.length > indexData && indexData !== -1) {
            const dataStr = colunas[indexData];
            const descricao = colunas[indexDesc] || 'Sem descrição';
            
            // Ignora linhas de saldo final, totais ou saldos bloqueados (comum no Bradesco)
            if (dataStr.toUpperCase().includes('TOTAL') || dataStr.toUpperCase().includes('SALDO') || descricao.toUpperCase().includes('SALDO')) {
                continue;
            }
            
            let valorCalculado = 0;
            
            // Se o arquivo separou Crédito e Débito (Padrão Bradesco)
            if (indexCredito !== -1 && indexDebito !== -1) {
                // Tira pontos de milhares e troca vírgula por ponto para o JavaScript entender
                let valCred = colunas[indexCredito] ? colunas[indexCredito].replace(/\./g, '').replace(',', '.') : '0';
                let valDeb = colunas[indexDebito] ? colunas[indexDebito].replace(/\./g, '').replace(',', '.') : '0';
                
                let numCred = parseFloat(valCred) || 0;
                let numDeb = parseFloat(valDeb) || 0;
                
                if (numCred > 0) valorCalculado = numCred;
                else if (numDeb > 0) valorCalculado = -Math.abs(numDeb); // Força o débito a ser negativo
            } 
            // Se o arquivo tem uma coluna de Valor única (Padrão Nubank/Inter)
            else if (indexValor !== -1) {
                let valCru = colunas[indexValor] ? colunas[indexValor].replace(/\./g, '').replace(',', '.') : '0';
                valorCalculado = parseFloat(valCru) || 0;
            }

            // Só salva se for um valor real e se a data parecer uma data válida (ex: contém barra)
            if (!isNaN(valorCalculado) && valorCalculado !== 0 && dataStr.includes('/')) {
                transacoesExtraidas.push({
                    data: dataStr,
                    descricao: descricao,
                    valor: valorCalculado,
                    tipo: valorCalculado < 0 ? 'debito' : 'credito',
                    idBanco: idBanco
                });
            }
        }
    }

    renderizarTabelaConciliacao(transacoesExtraidas);
}

// A Interface Homem-Máquina (Desenha na Tela para o Usuário)
function renderizarTabelaConciliacao(transacoes) {
    const container = document.getElementById('tabela-conciliacao-container');
    
    if (transacoes.length === 0) {
        container.innerHTML = `<p style="color: red; text-align: center; font-weight: bold; background: #ffebee; padding: 15px; border-radius: 8px;">Não foi possível encontrar transações válidas neste arquivo. Verifique se é o extrato correto do banco.</p>`;
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

    // Constrói o HTML do <select> de Categorias
    let selectCategorias = `<select class="select-categoria" style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid #b0bec5; background: #fafafa;">`;
    CATEGORIAS_PADRAO.forEach(cat => {
        selectCategorias += `<option value="${cat}">${cat}</option>`;
    });
    selectCategorias += `</select>`;

    transacoes.forEach((t, index) => {
        const corValor = t.tipo === 'debito' ? '#d32f2f' : '#2e7d32'; // Vermelho p/ Saída, Verde p/ Entrada
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
    window.mostrarToast("Extrato lido e mapeado com sucesso!");
}

// Injeta as opções de Bancos também no formulário de Extratos
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
