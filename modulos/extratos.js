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

    // Manda o navegador ler o arquivo como texto
    reader.readAsText(file);
};

// O Cérebro Analítico (Parse do CSV)
function analisarLinhasCSV(textoCSV, idBanco) {
    // Separa o texto por quebras de linha
    const linhas = textoCSV.split('\n');
    let transacoesExtraidas = [];

    // Ignora o cabeçalho (geralmente a linha 0) e lê o resto
    for (let i = 1; i < linhas.length; i++) {
        const linha = linhas[i].trim();
        if (!linha) continue;

        // Tenta separar as colunas por vírgula ou ponto-e-vírgula (Padrão Bradesco/Itaú/Nubank)
        const colunas = linha.split(/,|;/);
        
        if (colunas.length >= 3) {
            const dataStr = colunas[0].replace(/"/g, ''); // Tira aspas se tiver
            const descricao = colunas[1].replace(/"/g, '');
            
            // Tratamento pesado para números (Tira aspas, ajusta virgula para ponto)
            let valorCru = colunas[colunas.length - 1].replace(/"/g, '').trim();
            valorCru = valorCru.replace('R$', '').trim();
            // Se o padrão for brasileiro (1.000,00) converte para (1000.00)
            if (valorCru.includes(',') && valorCru.includes('.')) {
                valorCru = valorCru.replace(/\./g, '').replace(',', '.');
            } else if (valorCru.includes(',')) {
                valorCru = valorCru.replace(',', '.');
            }

            const valorNumerico = parseFloat(valorCru);

            if (!isNaN(valorNumerico)) {
                transacoesExtraidas.push({
                    data: dataStr,
                    descricao: descricao,
                    valor: valorNumerico,
                    tipo: valorNumerico < 0 ? 'debito' : 'credito',
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
        container.innerHTML = `<p style="color: red; text-align: center;">Não foi possível ler as transações. Verifique se o arquivo é um CSV válido.</p>`;
        return;
    }

    let html = `
        <h4 style="color:#002f6c; margin-bottom: 10px;">Pré-visualização do Extrato</h4>
        <p style="font-size: 12px; color: #666; margin-bottom: 15px;">Os <b>Créditos</b> serão conciliados com a Aba 1. Classifique os seus <b>Débitos</b> abaixo.</p>
        <table style="width: 100%; font-size: 13px;">
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Descrição Original</th>
                    <th style="text-align:right">Valor</th>
                    <th>Categoria (Aprendizado)</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Constrói o HTML do <select> de Categorias
    let selectCategorias = `<select class="select-categoria" style="width: 100%; padding: 5px; border-radius: 4px; border: 1px solid #ccc;">`;
    CATEGORIAS_PADRAO.forEach(cat => {
        selectCategorias += `<option value="${cat}">${cat}</option>`;
    });
    selectCategorias += `</select>`;

    transacoes.forEach((t, index) => {
        const corValor = t.tipo === 'debito' ? '#d32f2f' : '#2e7d32'; // Vermelho p/ Saída, Verde p/ Entrada
        const iconTipo = t.tipo === 'debito' ? '🔻' : '🟢';
        
        html += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px 5px;">${t.data}</td>
                <td style="padding: 10px 5px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${t.descricao}">
                    ${t.descricao}
                </td>
                <td style="padding: 10px 5px; text-align:right; font-weight: bold; color: ${corValor};">
                    ${iconTipo} R$ ${Math.abs(t.valor).toFixed(2)}
                </td>
                <td style="padding: 10px 5px; text-align:center;">
                    ${t.tipo === 'debito' ? selectCategorias : '<span style="color:#888; font-size: 11px;">(Conciliação Automática)</span>'}
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
        <button class="btn-action btn-green" style="margin-top: 20px;" onclick="alert('Salvar no Firebase: Funcionalidade em construção no próximo passo!')">💾 Salvar e Conciliar no Banco de Dados</button>
    `;

    container.innerHTML = html;
    window.mostrarToast("Extrato lido com sucesso! Analise os dados.");
}

// Injeta as opções de Bancos também no formulário de Extratos
window.atualizarSelectBancosUpload = () => {
    const selectUpload = document.getElementById('bancoExtratoUpload');
    if (!selectUpload) return;

    if (window.listaBancos.length === 0) {
        selectUpload.innerHTML = `<option value="">Aguardando Cadastro de Bancos...</option>`;
        return;
    }

    selectUpload.innerHTML = `<option value="">Selecione o Banco...</option>`;
    window.listaBancos.forEach(b => {
        selectUpload.innerHTML += `<option value="${b.id}">${b.nome}</option>`;
    });
};
