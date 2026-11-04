const STORAGE_KEY = "registrosAtrasos";
// Endpoint configurado apontando para o backend Spring Boot
const API_URL = window.APP_CONFIG?.API_URL?.trim() || "http://localhost:8080/api/frequencia/registrar";

const form = document.querySelector("#formulario-registro");
const cpfInput = document.querySelector("#cpf");
const nomeInput = document.querySelector("#nome");
const tipoInput = document.querySelector("#tipo-registro");
const feedbackRegistro = document.querySelector("#feedback-registro");

// === VARIÁVEIS DE ACESSIBILIDADE E SÍNTESE DE VOZ (TTS) ===
let modoVozAtivado = false;
const ecraBoasVindas = document.getElementById('ecra-boas-vindas');
const btnNormal = document.getElementById('btn-normal');

// Fala um texto e executa um callback quando a fala terminar (garante que o microfone só abre após o áudio parar)
function falarComCallback(texto, callbackAposFalar) {
    if (!texto) {
        if (callbackAposFalar) callbackAposFalar();
        return;
    }

    window.speechSynthesis.cancel();
    pararEscuta();

    if (!modoVozAtivado) {
        if (callbackAposFalar) callbackAposFalar();
        return;
    }

    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = 'pt-BR';
    fala.rate = 1.05;

    let finalizado = false;
    const concluir = () => {
        if (!finalizado) {
            finalizado = true;
            // Intervalo de 350ms para evitar eco no microfone
            setTimeout(() => {
                if (callbackAposFalar) callbackAposFalar();
            }, 350);
        }
    };

    fala.onend = concluir;
    fala.onerror = (e) => {
        console.warn("Evento de síntese de fala:", e);
        concluir();
    };

    window.speechSynthesis.speak(fala);
}

// Função de fala simples para feedback pontual
function falar(texto) {
    falarComCallback(texto, null);
}

// === SISTEMA AVANÇADO DE RECONHECIMENTO DE VOZ (SPEECH-TO-TEXT) ===
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let escutando = false;
let etapaConversa = "IDLE"; // IDLE, NOME, CPF, CONFIRMAR_AUTOCOMPLETE_CPF, TIPO, CONFIRMACAO
let tentativasSilencio = 0;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        escutando = true;
    };

    recognition.onend = () => {
        escutando = false;
    };

    recognition.onresult = (event) => {
        tentativasSilencio = 0;
        const transcricao = event.results[0][0].transcript.trim();
        processarRespostaPorVoz(transcricao);
    };

    recognition.onerror = (event) => {
        escutando = false;
        console.warn("SpeechRecognition error:", event.error);

        if (event.error === 'no-speech') {
            tentativasSilencio++;
            if (tentativasSilencio <= 2) {
                falarComCallback("Não consegui ouvir. Pode falar novamente?", () => {
                    ouvirEtapaAtual();
                });
            } else {
                falarComCallback("Não detectei som no microfone. Pressione a Barra de Espaço quando desejar tentar novamente.");
                etapaConversa = "IDLE";
            }
        } else if (event.error === 'not-allowed') {
            falarComCallback("O acesso ao microfone foi bloqueado. Por favor, permita o microfone no seu navegador para usar a voz.");
            etapaConversa = "IDLE";
        } else if (event.error !== 'aborted') {
            setTimeout(() => {
                if (modoVozAtivado && etapaConversa !== "IDLE") {
                    ouvirEtapaAtual();
                }
            }, 500);
        }
    };
}

function iniciarEscuta() {
    if (!recognition || !modoVozAtivado) return;
    try {
        window.speechSynthesis.cancel();
        if (!escutando) {
            recognition.start();
        }
    } catch (e) {
        console.warn("Tentativa de iniciar reconhecimento:", e);
    }
}

function pararEscuta() {
    if (!recognition) return;
    try {
        escutando = false;
        recognition.abort();
    } catch (e) {}
}

function ouvirEtapaAtual() {
    if (!modoVozAtivado || etapaConversa === "IDLE") return;
    iniciarEscuta();
}

// Inicia o fluxo conversacional interativo
function iniciarAssistenteDeVoz() {
    etapaConversa = "NOME";
    tentativasSilencio = 0;
    
    if (form) form.reset();
    if (feedbackRegistro) feedbackRegistro.hidden = true;

    if (!SpeechRecognition) {
        falarComCallback("Modo de acessibilidade ativado. Atenção: este navegador não suporta reconhecimento de fala pelo microfone. Utilize a tecla TAB para preencher os campos pelo teclado.");
        setTimeout(() => { if (nomeInput) nomeInput.focus(); }, 3000);
        return;
    }

    falarComCallback("Modo de acessibilidade por voz ativado! Vou te guiar passo a passo falando no microfone. Para começar, qual o seu nome completo?", () => {
        if (nomeInput) nomeInput.focus();
        ouvirEtapaAtual();
    });
}

// Processador do diálogo por voz
function processarRespostaPorVoz(textoOriginal) {
    if (!textoOriginal) {
        ouvirEtapaAtual();
        return;
    }

    const texto = textoOriginal.toLowerCase().trim();

    switch (etapaConversa) {
        case "NOME": {
            // Limpa saudações ou frases comuns ("meu nome é...", "eu sou o...")
            let nomeTratado = textoOriginal.trim()
                .replace(/^(meu nome é|o meu nome é|eu me chamo|me chamo|eu sou a|eu sou o|sou a|sou o)\s+/i, "")
                .replace(/[.,;!?]+$/g, "")
                .trim();

            // Capitaliza cada palavra
            nomeTratado = nomeTratado.replace(/(?:^|\s)\S/g, c => c.toUpperCase());

            if (nomeTratado.length < 3) {
                falarComCallback("Não consegui identificar o seu nome. Por favor, fale seu nome completo.", () => {
                    ouvirEtapaAtual();
                });
                return;
            }

            nomeInput.value = nomeTratado;
            nomeInput.focus();

            // Verifica se o aluno já existe no histórico para facilitar
            const alunoConhecido = getRegistros().find(r => r.nome.toLowerCase() === nomeTratado.toLowerCase());
            if (alunoConhecido && alunoConhecido.cpf) {
                cpfInput.value = alunoConhecido.cpf;
                etapaConversa = "CONFIRMAR_AUTOCOMPLETE_CPF";
                const cpfFalado = alunoConhecido.cpf.replace(/\D/g, "").split("").join(" ");
                falarComCallback(`Nome registrado: ${nomeTratado}. Encontrei o seu CPF no sistema: ${cpfFalado}. Deseja usar este CPF? Diga Sim para confirmar ou Não para ditar outro.`, () => {
                    ouvirEtapaAtual();
                });
                return;
            }

            etapaConversa = "CPF";
            falarComCallback(`Nome registrado: ${nomeTratado}. Agora, por favor, fale os 11 números do seu CPF.`, () => {
                if (cpfInput) cpfInput.focus();
                ouvirEtapaAtual();
            });
            break;
        }

        case "CONFIRMAR_AUTOCOMPLETE_CPF": {
            if (texto.includes("sim") || texto.includes("quero") || texto.includes("correto") || texto.includes("pode") || texto.includes("isso")) {
                etapaConversa = "TIPO";
                falarComCallback("CPF confirmado! Agora, qual o tipo de registro? Diga Atraso ou Saída Adiantada.", () => {
                    if (tipoInput) tipoInput.focus();
                    ouvirEtapaAtual();
                });
            } else {
                cpfInput.value = "";
                etapaConversa = "CPF";
                falarComCallback("Entendido. Por favor, fale os 11 números do seu CPF.", () => {
                    if (cpfInput) cpfInput.focus();
                    ouvirEtapaAtual();
                });
            }
            break;
        }

        case "CPF": {
            const digitos = extrairDigitosCpf(textoOriginal);

            if (digitos.length !== 11) {
                falarComCallback(`Entendi ${digitos.length} dígitos. O CPF deve conter exatamente 11 números. Por favor, fale novamente o seu CPF.`, () => {
                    ouvirEtapaAtual();
                });
                return;
            }

            if (!validarCpf(digitos)) {
                falarComCallback("O CPF falado não é válido pelo cálculo dos dígitos verificadores. Por favor, fale novamente os números do seu CPF.", () => {
                    ouvirEtapaAtual();
                });
                return;
            }

            cpfInput.value = formatarCpf(digitos);
            cpfInput.setCustomValidity("");
            if (feedbackRegistro) feedbackRegistro.hidden = true;

            const cpfFalado = digitos.split("").join(" ");
            etapaConversa = "TIPO";
            falarComCallback(`CPF validado: ${cpfFalado}. Agora, qual é o tipo de registro? Diga Atraso ou Saída Adiantada.`, () => {
                if (tipoInput) tipoInput.focus();
                ouvirEtapaAtual();
            });
            break;
        }

        case "TIPO": {
            const tipoDetectado = identificarTipo(texto);
            if (!tipoDetectado) {
                falarComCallback("Não identifiquei a opção. Por favor, diga apenas Atraso ou Saída Adiantada.", () => {
                    ouvirEtapaAtual();
                });
                return;
            }

            tipoInput.value = tipoDetectado;
            tipoInput.focus();

            etapaConversa = "CONFIRMACAO";
            const cpfSoDigitos = cpfInput.value.replace(/\D/g, "").split("").join(" ");
            falarComCallback(`Tudo pronto! Aluno: ${nomeInput.value}, CPF: ${cpfSoDigitos}, Registro: ${tipoDetectado}. Posso confirmar o envio? Diga Sim para enviar ou Não para recomeçar.`, () => {
                ouvirEtapaAtual();
            });
            break;
        }

        case "CONFIRMACAO": {
            if (texto.includes("sim") || texto.includes("pode") || texto.includes("confirmo") || texto.includes("enviar") || texto.includes("ok") || texto.includes("positivo") || texto.includes("correto")) {
                submeterFormularioPorVoz();
            } else if (texto.includes("não") || texto.includes("nao") || texto.includes("cancelar") || texto.includes("recomeçar") || texto.includes("recomecar")) {
                if (form) form.reset();
                etapaConversa = "NOME";
                falarComCallback("Registro cancelado. Vamos começar de novo. Qual o seu nome completo?", () => {
                    if (nomeInput) nomeInput.focus();
                    ouvirEtapaAtual();
                });
            } else {
                falarComCallback("Por favor, diga apenas Sim para confirmar o envio ou Não para recomeçar.", () => {
                    ouvirEtapaAtual();
                });
            }
            break;
        }

        default:
            ouvirEtapaAtual();
    }
}

// Extrai números falados em dígitos ou palavras por extenso em português
function extrairDigitosCpf(texto) {
    if (!texto) return "";

    const mapaPalavras = {
        "zero": "0",
        "um": "1", "uma": "1", "primeiro": "1",
        "dois": "2", "duas": "2", "segundo": "2",
        "três": "3", "tres": "3", "terceiro": "3",
        "quatro": "4", "quarto": "4",
        "cinco": "5", "quinto": "5",
        "seis": "6", "meia": "6", "sexto": "6",
        "sete": "7", "sétimo": "7", "setimo": "7",
        "oito": "8", "oitavo": "8",
        "nove": "9", "nono": "9"
    };

    let normalizado = texto.toLowerCase()
        .replace(/[-.,/]/g, " ")
        .replace(/\s+/g, " ");

    for (const [palavra, digito] of Object.entries(mapaPalavras)) {
        const regex = new RegExp(`\\b${palavra}\\b`, "gi");
        normalizado = normalizado.replace(regex, digito);
    }

    return normalizado.replace(/\D/g, "");
}

function identificarTipo(texto) {
    const t = texto.toLowerCase();
    if (t.includes("adiantad") || t.includes("saída") || t.includes("saida") || t.includes("sair mais cedo") || t.includes("cedo")) {
        return "Saída Adiantada";
    }
    if (t.includes("atraso") || t.includes("atrasad") || t.includes("cheguei tarde") || t.includes("tarde")) {
        return "Atraso";
    }
    return null;
}

// Submissão disparada por voz
async function submeterFormularioPorVoz() {
    etapaConversa = "ENVIANDO";
    falarComCallback("Enviando o seu registro, aguarde um momento...");

    const agora = new Date();
    const registro = {
        nome: nomeInput.value.trim(),
        cpf: cpfInput.value.trim(),
        tipo: tipoInput.value,
        data: dataLocal(agora),
        horario: agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    };

    try {
        const resultado = await salvarRegistro(registro);
        if (form) form.reset();
        etapaConversa = "IDLE";

        // Se API_URL não estiver configurada, responde localmente
        if (!API_URL) {
            falarComCallback(`${registro.tipo} registrado com sucesso para ${registro.nome}! Para realizar um novo registro, pressione a Barra de Espaço.`);
        }
    } catch (error) {
        etapaConversa = "IDLE";
        falarComCallback("Ocorreu uma falha ao enviar para o servidor, mas seu registro foi salvo localmente. Para realizar um novo registro, pressione a Barra de Espaço.");
    }
}

// === LÓGICA DO BANCO DE DADOS LOCAL E API ===
function getRegistros() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (error) {
        return [];
    }
}

function formatarCpf(value) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    return digits
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function dataLocal(date) {
    const ano = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, "0");
    const dia = String(date.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

async function salvarRegistro(registro) {
    if (API_URL) {
        try {
            const resposta = await fetch(API_URL, {
                body: JSON.stringify(registro),
                headers: { "Content-Type": "application/json" },
                method: "POST"
            });

            if (!resposta.ok) {
                const erro = new Error("A API recusou o registro.");
                erro.tipo = "api";
                throw erro;
            }

            const dados = await resposta.json();
            if (dados && dados.mensagemVoz) {
                falarComCallback(dados.mensagemVoz + ". Registro finalizado com sucesso! Para fazer um novo registro a qualquer momento, pressione a Barra de Espaço.");
            }

            localStorage.setItem(STORAGE_KEY, JSON.stringify([...getRegistros(), registro]));
            return "sucesso";
        } catch (error) {
            if (error.tipo === "api") throw error;
            localStorage.setItem(STORAGE_KEY, JSON.stringify([...getRegistros(), registro]));
            return "cache";
        }
    } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...getRegistros(), registro]));
        return "salvo";
    }
}

function validarCpf(cpf) {
    const digitos = cpf.replace(/\D/g, "");
    if (digitos.length !== 11) return false;

    // Rejeita padrões com todos os dígitos iguais (ex: 111.111.111-11)
    if (/^(\d)\1{10}$/.test(digitos)) return false;

    const calcularDigito = (base, pesoInicial) => {
        const soma = [...base].reduce((total, digito, indice) => total + Number(digito) * (pesoInicial - indice), 0);
        const resto = (soma * 10) % 11;
        return resto === 10 ? 0 : resto;
    };

    return calcularDigito(digitos.slice(0, 9), 10) === Number(digitos[9])
        && calcularDigito(digitos.slice(0, 10), 11) === Number(digitos[10]);
}

function exibirFeedback(mensagem, tipo) {
    feedbackRegistro.textContent = mensagem;
    feedbackRegistro.className = `feedback feedback--${tipo}`;
    feedbackRegistro.hidden = false;
    falar(mensagem);
}

// === LÓGICA DO FORMULÁRIO (DIGITAÇÃO MANUAL E TECLADO) ===
function autocompletarAluno(campoOrigem) {
    const registros = getRegistros();

    if (campoOrigem === 'cpf') {
        const cpfAtual = cpfInput.value;
        const alunoConhecido = registros.find(r => r.cpf === cpfAtual);
        if (alunoConhecido && !nomeInput.value) {
            nomeInput.value = alunoConhecido.nome;
            falar("Nome autocompletado com: " + alunoConhecido.nome);
        }
    } else if (campoOrigem === 'nome') {
        const nomeAtual = nomeInput.value.trim().toLowerCase();
        const alunoConhecido = [...registros].reverse().find(r => r.nome.toLowerCase() === nomeAtual);
        if (alunoConhecido && !cpfInput.value) {
            cpfInput.value = alunoConhecido.cpf;
            falar("CPF autocompletado.");
        }
    }
}

nomeInput.addEventListener("blur", () => autocompletarAluno('nome'));

cpfInput.addEventListener("input", (event) => {
    event.target.setCustomValidity("");
    if (feedbackRegistro) feedbackRegistro.hidden = true;
    event.target.value = formatarCpf(event.target.value);

    if (event.target.value.length === 14) {
        autocompletarAluno('cpf');
    }
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nome = nomeInput.value.trim();
    const cpf = cpfInput.value.trim();
    const cpfDigits = cpf.replace(/\D/g, "");
    const tipo = tipoInput.value;

    if (!validarCpf(cpfDigits)) {
        cpfInput.setCustomValidity("Digite um CPF válido.");
        cpfInput.reportValidity();
        exibirFeedback("Verifique o CPF informado e tente novamente.", "erro-validacao");
        return;
    }
    cpfInput.setCustomValidity("");

    const agora = new Date();
    const registro = {
        nome,
        cpf,
        tipo,
        data: dataLocal(agora),
        horario: agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    };

    try {
        const resultado = await salvarRegistro(registro);
        form.reset();

        if (!API_URL) {
            exibirFeedback(resultado === "cache"
                ? "Sem conexão com a API. O registro foi salvo localmente."
                : `${tipo} registrado com sucesso.`, resultado === "cache" ? "erro-rede" : "sucesso");
        }
    } catch (error) {
        exibirFeedback(error.tipo === "api"
            ? "O registro foi recusado pela API. Revise os dados."
            : "Não foi possível registrar. Tente novamente.", error.tipo === "api" ? "erro-validacao" : "erro-rede");
    }
});

// === LÓGICA DE INICIALIZAÇÃO E TECLADO ===

// 1. Interação com a tela de Boas-vindas ou reinício por Barra de Espaço
document.addEventListener('keydown', function(event) {
    // Se a tela de boas vindas estiver visível e a tecla for Espaço:
    if (ecraBoasVindas && ecraBoasVindas.style.display !== 'none' && event.code === 'Space') {
        event.preventDefault();
        modoVozAtivado = true;
        ecraBoasVindas.style.display = 'none';
        iniciarAssistenteDeVoz();
        return;
    }

    // Se já estiver na tela principal e pressionar a Barra de Espaço fora de campos de texto:
    if (modoVozAtivado && event.code === 'Space' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'SELECT') {
        event.preventDefault();
        iniciarAssistenteDeVoz();
    }
});

if (btnNormal) {
    btnNormal.addEventListener('click', () => {
        ecraBoasVindas.style.display = 'none'; // Apenas esconde a tela, voz continua desligada
    });
}

// 2. Leitura dos campos com a tecla TAB (Focus)
const elementosNavegaveis = document.querySelectorAll('input, button, select');

elementosNavegaveis.forEach(elemento => {
    elemento.addEventListener('focus', () => {
        // Se estiver ativamente em fluxo de pergunta por voz, não interrompe com leitura de focus
        if (etapaConversa !== "IDLE") return;

        let textoParaLer = elemento.getAttribute('aria-label') || elemento.placeholder || elemento.innerText || elemento.name;

        if (elemento.id === 'tipo-registro') {
            textoParaLer = "Selecione o tipo de registro. Use as setas para cima e para baixo para mudar.";
        }

        if (elemento.tagName === 'INPUT') {
            falar("Campo " + textoParaLer + ". Pode começar a escrever.");
        } else {
            falar(textoParaLer);
        }
    });
});
