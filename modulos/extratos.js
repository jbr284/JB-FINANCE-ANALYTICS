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

    // Lê o arquivo em Latin1 para não quebrar os acentos dos sistemas bancários do Brasil
    reader.readAsText(file, 'ISO-8859-1');
};

// O Novo Cérebro Analítico (Robô Universal Bradesco/Itaú/Nubank)
function analisarLinhasCSV(textoCSV, idBanco) {
    const linhas = textoCSV.split('\n');
    let transacoesExtraidas = [];
    
    let indexData = -1, indexDesc = -1, indexValor = -1, indexCredito = -1, indexDebito = -1;
    let dadosIniciaram = false;
    
    // Descobre se o banco usa ponto-e-vírgula ou vírgula
    const separador = textoCSV.includes(';') ? ';' : ',';

    for (let i = 0; i < linhas.length; i++) {
        let linha = linhas[i].trim();
        if (!linha) continue;

        // Divide as colunas com segurança, sem quebrar os centavos
        const colunas = linha.split(separador).map(c => c.replace(/"/g, '').trim());
        
        // 1. FASE DE MAPEAMENTO: Procura onde a tabela real começa
        if (!dadosIniciaram) {
            // Limpa tudo para facilitar a busca (remove acentos e deixa maiúsculo)
            const linhaUpper = colunas.map(c => c.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim());
            
            // Verifica se esta linha é o cabeçalho procurando "DATA" e outra palavra chave
            const isHeader = linhaUpper.some(c => c.includes('DATA')) && 
                             (linhaUpper.some(c => c.includes('HIST') || c.includes('DESC') || c.includes('LANC')) || 
                              linhaUpper.some(c => c.includes('VALOR') || c.includes('CRED') || c.includes('DEB')));
            
            if (isHeader) {
                indexData = linhaUpper.findIndex(c => c.includes('DATA'));
                
                // Tenta achar a descrição (Bradesco usa Histórico)
                let idxHist = linhaUpper.findIndex(c => c.includes('HIST'));
                let idxDesc = linhaUpper.findIndex(c => c.includes('DESC'));
                let idxLanc = linhaUpper.findIndex(c => c.includes('LANC'));
                indexDesc = idxHist !== -1 ? idxHist : (idxDesc !== -1 ? idxDesc : idxLanc);
                
                // Acha as colunas de valor
                indexCredito = linhaUpper.findIndex(c => c.includes('CRED'));
                indexDebito = linhaUpper.findIndex(c => c.includes('DEB'));
                indexValor = linhaUpper.findIndex(c => c.includes('VALOR'));
                
                dadosIniciaram = true;
            }
            continue; 
        }

        // 2. FASE DE EXTRAÇÃO: Lê as linhas e valores
        if (dadosIniciaram && colunas.length > indexData && indexData !== -1) {
            const dataStr = colunas[indexData];
            
            // Se não tiver data na coluna ou não tiver barra (ex: 15/08), ignora
            if (!dataStr || !dataStr.includes('/')) continue;
            
            const descricao = indexDesc !== -1 && colunas[indexDesc] ? colunas[indexDesc] : 'Sem descrição';
            
            // Pula linhas de saldo final, totais ou cabeçalhos residuais
            if (dataStr.toUpperCase().includes('TOTAL') || dataStr.toUpperCase().includes('SALDO') || descricao.toUpperCase().includes('SALDO')) {
                continue;
            }
            
            let valorCalculado = 0;
            
            // Se o arquivo separou Crédito e Débito (Padrão Bradesco)
            if (indexCredito !== -1 && indexDebito !== -1) {
                let valCred = colunas[indexCredito] ? colunas[indexCredito].replace(/\./g, '').replace(',', '.') : '0';
                let valDeb = colunas[indexDebito] ? colunas[indexDebito].replace(/\./g, '').replace(',', '.') : '0';
                
                let numCred = parseFloat(valCred) || 0;
                let numDeb = parseFloat(valDeb) || 0;
                
                if (numCred > 0) valorCalculado = numCred;
                else if (numDeb > 0) valorCalculado = -Math.abs(numDeb); // Força o débito a ser negativo
            } 
            // Se for coluna de Valor única (Nubank)
            else if (indexValor !== -1) {
                let valCru = colunas[indexValor] ? colunas[indexValor].replace(/\./g, '').replace(',', '.') : '0';
                valorCalculado = parseFloat(valCru) || 0;
            }
            // Plano B (Fallback Extremo Bradesco): Se não achou cabeçalho limpo, mas a linha tem as 6 colunas clássicas do Bradesco
            else if (colunas.length >= 5) {
                // Bradesco padrão sem nome: Data(0), Historico(1), Docto(2), Credito(3), Debito(4), Saldo(5)
                let valCred = colunas[3] ? colunas[3].replace(/\./g, '').replace(',', '.') : '0';
                let valDeb = colunas[4] ? colunas[4].replace(/\./g, '').replace(',', '.') : '0';
                
                let numCred = parseFloat(valCred) || 0;
                let numDeb = parseFloat(valDeb) || 0;
                
                if (numCred > 0) valorCalculado = numCred;
                else if (numDeb > 0) valorCalculado = -Math.abs(numDeb);
            }

            // Regista a transação na tela se encontrou um valor válido
            if (!isNaN(valorCalculado) && valorCalculado !== 0) {
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
    window.mostrarToast("Extrato lido e mapeado com sucesso!");
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
