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

// Variável global para evitar que o Garbage Collector do Chrome mate a fala antes do onend
window._activeUtterance = null;
let fallbackSpeechTimer = null;

// Sinal sonoro (BIP suave) para avisar o usuário que o microfone abriu e está ouvindo
function tocarBipDeEscuta() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        // Tom ascendente suave (D5 -> A5)
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.22);
    } catch (e) {
        console.warn("Áudio de bip não suportado:", e);
    }
}

// Fala um texto e executa um callback quando a fala terminar
function falarComCallback(texto, callbackAposFalar) {
    if (!texto) {
        if (callbackAposFalar) callbackAposFalar();
        return;
    }

    if (fallbackSpeechTimer) {
        clearTimeout(fallbackSpeechTimer);
        fallbackSpeechTimer = null;
    }

    window.speechSynthesis.cancel();
    pararEscuta();

    if (!modoVozAtivado) {
        if (callbackAposFalar) callbackAposFalar();
        return;
    }

    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = 'pt-BR';
    fala.rate = 1.08;
    window._activeUtterance = fala;

    let finalizado = false;
    const concluir = () => {
        if (!finalizado) {
            finalizado = true;
            if (fallbackSpeechTimer) {
                clearTimeout(fallbackSpeechTimer);
                fallbackSpeechTimer = null;
            }
            window._activeUtterance = null;
            // Intervalo de 300ms para evitar eco no microfone
            setTimeout(() => {
                if (callbackAposFalar) callbackAposFalar();
            }, 300);
        }
    };

    fala.onend = concluir;
    fala.onerror = (e) => {
        console.warn("Evento de síntese de fala:", e);
        concluir();
    };

    // Watchdog de segurança: se o Chrome engolir o onend por bug do V8, força a conclusão
    const tempoEstimadoMs = Math.max(2500, (texto.length * 85) / fala.rate);
    fallbackSpeechTimer = setTimeout(concluir, tempoEstimadoMs + 800);

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

function pararEscuta() {
    escutando = false;
    if (recognition) {
        try {
            recognition.abort();
        } catch (e) {}
    }
}

// Inicia escuta criando uma nova instância limpa (evita travamento do SpeechRecognition no Chrome)
function ouvirEtapaAtual() {
    if (!modoVozAtivado || etapaConversa === "IDLE") return;

    if (!SpeechRecognition) {
        falar("Seu navegador não suporta reconhecimento de voz pelo microfone. Utilize o teclado com a tecla TAB.");
        return;
    }

    // Verifica se abriu como file:// (o Chrome bloqueia o microfone da Web Speech API se for aberto como arquivo)
    if (window.location.protocol === "file:") {
        const msgErro = "Atenção: A página foi aberta como arquivo local (file://). O Google Chrome só permite o microfone quando aberto através de um servidor local como http://localhost:8080 ou pelo Live Server do VS Code.";
        exibirFeedback(msgErro, "erro-rede");
        falarComCallback(msgErro);
        return;
    }

    pararEscuta();

    try {
        recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = false;
        recognition.interimResults = true; // Digita em TEMPO REAL enquanto o usuário fala!
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            escutando = true;
            console.log("🎤 Microfone ativo ouvindo etapa:", etapaConversa);
            tocarBipDeEscuta();
            atualizarIndicadorVisual(true);
        };

        recognition.onresult = (event) => {
            tentativasSilencio = 0;
            let interimTranscript = "";
            let finalTranscript = "";

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const item = event.results[i];
                if (item.isFinal) {
                    finalTranscript += item[0].transcript;
                } else {
                    interimTranscript += item[0].transcript;
                }
            }

            // Exibição em tempo real na tela enquanto a pessoa fala
            if (interimTranscript) {
                mostrarDigitacaoEmTempoReal(interimTranscript);
            }

            // Processamento do resultado final falado
            if (finalTranscript.trim()) {
                console.log("🗣️ Fala final detectada:", finalTranscript);
                processarRespostaPorVoz(finalTranscript.trim());
            }
        };

        recognition.onerror = (event) => {
            escutando = false;
            atualizarIndicadorVisual(false);
            console.warn("⚠️ SpeechRecognition erro:", event.error);

            if (event.error === 'no-speech') {
                tentativasSilencio++;
                if (tentativasSilencio <= 2) {
                    falarComCallback("Não consegui ouvir. Por favor, fale novamente após o sinal.", () => {
                        ouvirEtapaAtual();
                    });
                } else {
                    falarComCallback("Não detectei som no microfone. Pressione a Barra de Espaço quando desejar tentar novamente.");
                    etapaConversa = "IDLE";
                }
            } else if (event.error === 'not-allowed') {
                falarComCallback("O acesso ao microfone foi bloqueado. Por favor, permita o microfone nas configurações do navegador.");
                etapaConversa = "IDLE";
            } else if (event.error === 'network') {
                const msgBloqueio = "Não foi possível conectar ao serviço de voz neste navegador. Recomendamos mudar de navegador para o Microsoft Edge, ou preencher pelo teclado com a tecla TAB.";
                console.warn("⚠️ Falha de conexão na API de voz do navegador atual:", event.error);
                exibirFeedback("Recomendamos mudar para o navegador Microsoft Edge ou preencher pelo teclado com a tecla TAB.", "erro-rede");
                falarComCallback(msgBloqueio, () => {
                    if (nomeInput) nomeInput.focus();
                });
                etapaConversa = "IDLE";
            } else if (event.error !== 'aborted') {
                setTimeout(() => {
                    if (modoVozAtivado && etapaConversa !== "IDLE") {
                        ouvirEtapaAtual();
                    }
                }, 400);
            }
        };

        recognition.onend = () => {
            escutando = false;
            atualizarIndicadorVisual(false);
        };

        recognition.start();
    } catch (e) {
        console.error("Falha ao abrir microfone:", e);
        escutando = false;
        atualizarIndicadorVisual(false);
    }
}

// Mostra o que está sendo falado diretamente no campo enquanto a pessoa fala (feedback imediato)
function mostrarDigitacaoEmTempoReal(textoInterim) {
    if (!textoInterim) return;

    if (etapaConversa === "NOME" && nomeInput) {
        nomeInput.value = textoInterim;
    } else if (etapaConversa === "CPF" && cpfInput) {
        const digitos = extrairDigitosCpf(textoInterim);
        cpfInput.value = digitos ? formatarCpf(digitos) : textoInterim;
    }
}

// Altera o placeholder para sinalizar visualmente que o microfone está escutando
function atualizarIndicadorVisual(ativo) {
    if (etapaConversa === "NOME" && nomeInput) {
        if (ativo) {
            nomeInput.placeholder = "🎤 Ouvindo seu nome... Pode falar";
            nomeInput.focus();
        } else {
            nomeInput.placeholder = "Digite o seu nome completo";
        }
    } else if (etapaConversa === "CPF" && cpfInput) {
        if (ativo) {
            cpfInput.placeholder = "🎤 Ouvindo seu CPF... Pode falar";
            cpfInput.focus();
        } else {
            cpfInput.placeholder = "Digite seu CPF";
        }
    }
}

// Inicia o fluxo conversacional interativo
function iniciarAssistenteDeVoz() {
    etapaConversa = "NOME";
    tentativasSilencio = 0;

    if (form) form.reset();
    if (feedbackRegistro) feedbackRegistro.hidden = true;

    if (!SpeechRecognition) {
        falarComCallback("Modo de acessibilidade ativado. Atenção: este navegador não suporta reconhecimento de fala por microfone. Utilize a tecla TAB para preencher os campos pelo teclado.");
        setTimeout(() => { if (nomeInput) nomeInput.focus(); }, 3000);
        return;
    }

    falarComCallback("Acessibilidade ativada! Fale o seu nome completo após o sinal sonoro.", () => {
        if (nomeInput) {
            nomeInput.value = "";
            nomeInput.focus();
        }
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

            if (nomeTratado.length < 2) {
                falarComCallback("Não consegui identificar o seu nome. Por favor, fale novamente após o sinal.", () => {
                    ouvirEtapaAtual();
                });
                return;
            }

            nomeInput.value = nomeTratado;
            nomeInput.focus();

            // Verifica se o aluno já existe no histórico para facilitar
            const alunoConhecido = getRegistros().find(r => r.nome && r.nome.toLowerCase() === nomeTratado.toLowerCase());
            if (alunoConhecido && alunoConhecido.cpf) {
                cpfInput.value = alunoConhecido.cpf;
                etapaConversa = "CONFIRMAR_AUTOCOMPLETE_CPF";
                const cpfFalado = alunoConhecido.cpf.replace(/\D/g, "").split("").join(" ");
                falarComCallback(`Nome registrado: ${nomeTratado}. Encontrei o seu CPF: ${cpfFalado}. Deseja usar este CPF? Diga Sim ou Não após o sinal.`, () => {
                    ouvirEtapaAtual();
                });
                return;
            }

            etapaConversa = "CPF";
            falarComCallback(`Nome registrado: ${nomeTratado}. Agora, fale os 11 números do seu CPF após o sinal.`, () => {
                if (cpfInput) {
                    cpfInput.value = "";
                    cpfInput.focus();
                }
                ouvirEtapaAtual();
            });
            break;
        }

        case "CONFIRMAR_AUTOCOMPLETE_CPF": {
            if (texto.includes("sim") || texto.includes("quero") || texto.includes("correto") || texto.includes("pode") || texto.includes("isso")) {
                etapaConversa = "TIPO";
                falarComCallback("CPF confirmado! Qual o tipo de registro? Diga Atraso ou Saída Adiantada após o sinal.", () => {
                    if (tipoInput) tipoInput.focus();
                    ouvirEtapaAtual();
                });
            } else {
                cpfInput.value = "";
                etapaConversa = "CPF";
                falarComCallback("Entendido. Por favor, fale os 11 números do seu CPF após o sinal.", () => {
                    if (cpfInput) cpfInput.focus();
                    ouvirEtapaAtual();
                });
            }
            break;
        }

        case "CPF": {
            const digitos = extrairDigitosCpf(textoOriginal);

            if (digitos.length !== 11) {
                falarComCallback(`Entendi ${digitos.length} números. O CPF precisa de 11 dígitos. Fale novamente o seu CPF após o sinal.`, () => {
                    if (cpfInput) cpfInput.value = "";
                    ouvirEtapaAtual();
                });
                return;
            }

            if (!validarCpf(digitos)) {
                falarComCallback("O CPF não é válido pelo cálculo de verificação. Fale novamente os números do seu CPF após o sinal.", () => {
                    if (cpfInput) cpfInput.value = "";
                    ouvirEtapaAtual();
                });
                return;
            }

            cpfInput.value = formatarCpf(digitos);
            cpfInput.setCustomValidity("");
            if (feedbackRegistro) feedbackRegistro.hidden = true;

            const cpfFalado = digitos.split("").join(" ");
            etapaConversa = "TIPO";
            falarComCallback(`CPF validado: ${cpfFalado}. Qual é o tipo de registro? Diga Atraso ou Saída Adiantada após o sinal.`, () => {
                if (tipoInput) tipoInput.focus();
                ouvirEtapaAtual();
            });
            break;
        }

        case "TIPO": {
            const tipoDetectado = identificarTipo(texto);
            if (!tipoDetectado) {
                falarComCallback("Não identifiquei. Por favor, diga apenas Atraso ou Saída Adiantada após o sinal.", () => {
                    ouvirEtapaAtual();
                });
                return;
            }

            tipoInput.value = tipoDetectado;
            tipoInput.focus();

            etapaConversa = "CONFIRMACAO";
            const cpfSoDigitos = cpfInput.value.replace(/\D/g, "").split("").join(" ");
            falarComCallback(`Resumo: Aluno ${nomeInput.value}, CPF ${cpfSoDigitos}, Registro de ${tipoDetectado}. Posso confirmar o envio? Diga Sim ou Não após o sinal.`, () => {
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
                falarComCallback("Registro cancelado. Vamos começar de novo. Qual o seu nome completo após o sinal?", () => {
                    if (nomeInput) nomeInput.focus();
                    ouvirEtapaAtual();
                });
            } else {
                falarComCallback("Diga apenas Sim para enviar ou Não para recomeçar.", () => {
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
        const alunoConhecido = [...registros].reverse().find(r => r.nome && r.nome.toLowerCase() === nomeAtual);
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
