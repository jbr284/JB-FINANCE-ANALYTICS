// === modulos/motor-modular.js ===
import { db, collection, getDocs, getDoc, setDoc, doc, deleteDoc } from './firebase-config.js';

export const BENEFICIOS_FIXOS = 1225;

// Carrega o histórico de fechamentos
export async function carregarDadosModular() {
    const snapMod = await getDocs(collection(db, "renda_modular"));
    return snapMod.docs.map(d => d.data());
}

// Carrega o Salário Base atual salvo no sistema
export async function buscarSalarioBaseConfigurado() {
    const confSnap = await getDoc(doc(db, "configuracoes", "modular_base"));
    if (confSnap.exists() && confSnap.data().salarioBase) {
        return parseFloat(confSnap.data().salarioBase);
    }
    return 0; // Retorna 0 se não houver salário configurado
}

// Salva um novo Salário Base no banco
export async function salvarSalarioBaseNoBanco(base) {
    await setDoc(doc(db, "configuracoes", "modular_base"), { salarioBase: base }, { merge: true });
}

// Regista o fechamento do mês
export async function salvarFechamentoNoBanco(idUnico, registro) {
    await setDoc(doc(db, "renda_modular", idUnico), registro, { merge: true });
}

// Apaga um registo de fechamento
export async function excluirFechamentoNoBanco(id) {
    await deleteDoc(doc(db, "renda_modular", id));
}

// Verifica e gera o adiantamento de 40% se for dia 15 ou posterior
export async function verificarGeracaoAdiantamento(baseVal, registrosAtuais) {
    if (baseVal <= 0) return null; 
    
    const hoje = new Date();
    if (hoje.getDate() < 15) return null; 

    const ano = hoje.getFullYear();
    const mes = hoje.getMonth(); 
    const mesReal = mes + 1;
    const idUnico = `MOD-${ano}-${mesReal}`;

    const existe = registrosAtuais.find(r => r.id === idUnico);
    
    if (!existe) {
        const adiantamento = baseVal * 0.40;
        const novoReg = {
            id: idUnico, ano: ano, mes: mes,
            salarioBase: baseVal, adiantamento: adiantamento,
            salario: 0, outras: 0, nomeOutras: '',
            beneficios: BENEFICIOS_FIXOS, totalRemunerativo: adiantamento, 
            totalGeral: adiantamento + BENEFICIOS_FIXOS, geradoAutomaticamente: true
        };
        await salvarFechamentoNoBanco(idUnico, novoReg);
        return novoReg;
    }
    return null;
}
