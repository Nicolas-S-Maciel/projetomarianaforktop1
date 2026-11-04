const STORAGE_KEY = "registrosAtrasos";

const totalRegistros = document.querySelector("#total-registros");
const registrosHoje = document.querySelector("#registros-hoje");
const percentualHoje = document.querySelector("#percentual-hoje");
const listaRegistros = document.querySelector("#lista-registros");
const estadoVazio = document.querySelector("#estado-vazio");
const seletorAluno = document.querySelector("#seletor-aluno");
const alunoSelecionado = document.querySelector("#aluno-selecionado");
const cpfSelecionado = document.querySelector("#cpf-selecionado");
const frequenciaAluno = document.querySelector("#frequencia-aluno");
const seletorPeriodo = document.querySelector("#seletor-periodo");
const API_URL = window.APP_CONFIG?.API_URL?.trim() || "";
const PERDA_POR_REGISTRO = 2;

function carregarRegistros() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } 
    catch (error) { return []; }
}

async function obterRegistros() {
    if (!API_URL) return carregarRegistros();

    try {
        const resposta = await fetch(API_URL);
        if (!resposta.ok) throw new Error("Não foi possível carregar os registros da API.");
        const registros = await resposta.json();
        if (!Array.isArray(registros)) throw new Error("Resposta inválida da API.");
        localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
        return registros;
    } catch (error) {
        return carregarRegistros();
    }
}

function escaparHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[character]));
}

function dataAtual() {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}

function formatarData(data) {
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
}

async function atualizarRelatorio() {
    const registros = await obterRegistros();
    const periodo = seletorPeriodo.value;
    const registrosDoPeriodo = periodo
        ? registros.filter((registro) => registro.data?.startsWith(periodo))
        : registros;
    
    // --- Lógica Geral do Relatório Restaurada ---
    const hoje = registrosDoPeriodo.filter((registro) => registro.data === dataAtual()).length;
    const percentual = registrosDoPeriodo.length ? Math.round((hoje / registrosDoPeriodo.length) * 100) : 0;

    totalRegistros.textContent = registrosDoPeriodo.length;
    registrosHoje.textContent = hoje;
    percentualHoje.textContent = `${percentual}%`;

    const alunos = [...new Map(registrosDoPeriodo.map((registro) => [registro.cpf, {
        cpf: registro.cpf,
        nome: registro.nome
    }])).values()];
    const alunoAtual = seletorAluno.value || alunos[0]?.cpf || "";

    seletorAluno.innerHTML = alunos.length
        ? alunos.map((a) => `<option value="${escaparHtml(a.cpf)}">${escaparHtml(a.nome)} - ${escaparHtml(a.cpf)}</option>`).join("")
        : `<option value="">Nenhum aluno registrado</option>`;
    seletorAluno.value = alunos.some((a) => a.cpf === alunoAtual) ? alunoAtual : alunos[0]?.cpf || "";

    const aluno = alunos.find((item) => item.cpf === seletorAluno.value);
    const registrosDoAluno = registrosDoPeriodo.filter((registro) => registro.cpf === seletorAluno.value);
    // ---------------------------------------------

    // --- LÓGICA DE FREQUÊNCIA ---
    const totalRegistrosAluno = registrosDoAluno.length;
    const porcentagemAtual = Math.max(0, 100 - (totalRegistrosAluno * PERDA_POR_REGISTRO));
    
    if (aluno && frequenciaAluno) {
        frequenciaAluno.textContent = `${porcentagemAtual}%`;
        frequenciaAluno.classList.toggle("frequencia--alerta", totalRegistrosAluno >= 3);
    } else if (frequenciaAluno) {
        frequenciaAluno.textContent = "100%";
        frequenciaAluno.classList.remove("frequencia--alerta");
    }
    // ----------------------------

    alunoSelecionado.textContent = aluno?.nome || "Nenhum aluno selecionado";
    cpfSelecionado.textContent = aluno?.cpf || "Registre um aluno para consultar o histórico.";
    listaRegistros.innerHTML = "";
    
    if(estadoVazio) estadoVazio.hidden = registrosDoAluno.length > 0;

    [...registrosDoAluno].reverse().forEach((registro) => {
        const linha = document.createElement("tr");
        linha.innerHTML = `
            <td>${formatarData(registro.data)}</td>
            <td>${escaparHtml(registro.horario)}</td>
            <td>${escaparHtml(registro.tipo || "Atraso")}</td>
        `;
        listaRegistros.appendChild(linha);
    });
}

seletorAluno.addEventListener("change", atualizarRelatorio);
seletorPeriodo.addEventListener("change", atualizarRelatorio);

const btnImprimir = document.querySelector("#btn-imprimir");
if (btnImprimir) {
    btnImprimir.addEventListener("click", async () => {
        await atualizarRelatorio();
        window.print();
    });
}
seletorPeriodo.value = dataAtual().slice(0, 7);
atualizarRelatorio();
