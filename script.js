
"use strict";

/* ==========================================
   RENOVA-ME: A JORNADA!
   Menus, controles e física inicial
   ========================================== */

const $ = (seletor) => document.querySelector(seletor);
const telas = document.querySelectorAll(".tela");

function mostrarTela(id) {
    telas.forEach((tela) => {
        const ativa = tela.id === id;
        tela.hidden = !ativa;
        tela.classList.toggle("ativa", ativa);
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------- Menus já existentes ----------

$("#btn-jogar").addEventListener("click", () => {
    mostrarTela("tela-boas-vindas");
});

$("#btn-como-jogar").addEventListener("click", () => {
    mostrarTela("tela-instrucoes");
});

$("#btn-creditos").addEventListener("click", () => {
    mostrarTela("tela-creditos");
});

document.querySelectorAll(".btn-menu").forEach((botao) => {
    botao.addEventListener("click", () => {
        pararFase();
        mostrarTela("tela-inicial");
    });
});

$("#btn-continuar").addEventListener("click", () => {
    mostrarTela("tela-selecao-fases");
});

$("#btn-versiculo-final").addEventListener("click", () => {
    $("#versiculo-final").hidden = !$("#versiculo-final").hidden;
});

$("#btn-tentar-novamente").addEventListener("click", iniciarFase);

$("#btn-jogar-novamente").addEventListener("click", () => {
    mostrarTela("tela-boas-vindas");
});

// ---------- Elementos do jogo ----------

const cenario = $("#cenario");
const personagem = $("#personagem-robozinho");
const personagens = $("#personagens");

const faixaCenario = document.createElement("div");
faixaCenario.id = "faixa-cenario";
const imagensFaixa = [];

// Cada fase é formada por quatro partes em sequência. A faixa contém
// duas cópias da sequência para permitir a repetição contínua do cenário.
function carregarCenario(fase) {
    faixaCenario.replaceChildren();
    imagensFaixa.length = 0;

    const sufixos = fase === 1 ? ["", "a", "b", "c"] : ["", "a", "b", "c"];
    const nomes = sufixos.map((sufixo) => `Fase${fase}${sufixo}.png`);

    for (let volta = 0; volta < 2; volta++) {
        nomes.forEach((nome) => {
            const imagem = document.createElement("img");
            imagem.src = nome;
            imagem.alt = "";
            imagem.draggable = false;
            imagem.onerror = () => {
                console.error(`Não foi possível carregar a imagem do cenário: ${nome}`);
                imagem.dataset.erro = "true";
            };
            imagensFaixa.push(imagem);
            faixaCenario.appendChild(imagem);
        });
    }

    if (!faixaCenario.isConnected) {
        cenario.insertBefore(faixaCenario, cenario.firstChild);
    }
}

cenario.insertBefore(faixaCenario, cenario.firstChild);
carregarCenario(1);

const mensagemFase = $("#mensagem-fase");
const indicadorVidas = $("#indicador-vidas");
const indicadorFase = $("#indicador-fase");

const botaoPausar = $("#btn-pausar");
const telaPausa = $("#tela-pausa");

function pausarJogo() {
    if ($("#tela-jogo").hidden) return;
    jogoPausado = !jogoPausado;
    telaPausa.hidden = !jogoPausado;
    botaoPausar.textContent = jogoPausado ? "Retomar" : "Pausar";
    botaoPausar.setAttribute("aria-pressed", String(jogoPausado));
    if (jogoPausado) {
        teclas.clear();
        tempoPulo = 0;
    } else {
        fisica.ultimoTempo = performance.now();
    }
}

botaoPausar.addEventListener("click", pausarJogo);
$("#btn-retomar").addEventListener("click", () => {
    if (jogoPausado) pausarJogo();
});
$("#btn-sair-fase").addEventListener("click", voltarEscolhaFases);
$("#btn-pausa-escolher").addEventListener("click", voltarEscolhaFases);

function voltarEscolhaFases() {
    pararFase();
    jogoPausado = false;
    telaPausa.hidden = true;
    botaoPausar.textContent = "Pausar";
    botaoPausar.setAttribute("aria-pressed", "false");
    mostrarTela("tela-selecao-fases");
}

const listaFases = $("#lista-fases");
for (let numeroFase = 1; numeroFase <= 10; numeroFase++) {
    const botaoFase = document.createElement("button");
    botaoFase.type = "button";
    botaoFase.textContent = `Fase ${numeroFase}`;
    botaoFase.addEventListener("click", () => iniciarFase(numeroFase));
    listaFases.appendChild(botaoFase);
}


const teclas = new Set();

const fisica = {
    velocidadeX: 0,
    posicaoX: 0,
    velocidadeY: 0,
    alturaPulo: 0,

    gravidade: 1650,
    impulsoPulo: 820,
    velocidadeMaxima: 310,
    aceleracao: 1050,
    desaceleracao: 1500,

    velocidadeCenario: 95,
    posicaoCenario: 0,

    noChao: true,
    agachado: false,
    bibliaAtiva: false,
    faseIniciada: false,
    ultimoTempo: 0,
    tempoFase: 0,
    vidas: 7,
    invulneravelAte: 0,
    fase: 1
};

let quadroAnimacao = 0;
const ponteirosAtivos = new Map();
let tempoPulo = 0;
let idBiblia = null;
const bibliasAtivas = new Set();
let tempoAnimacaoCorrida = 0;
let quadroCorrida = 0;
let ultimaDirecao = 1; // 1 = direita, -1 = esquerda
let jaSeMoveu = false;
let ultimoLancamento = 0;
let jogoPausado = false;
let emEstradaCelestial = false;
let etapaEscada = "nenhuma";
let tempoEtapaEscada = 0;
let passagensCelestiais = 0;
let camadaCelestial = null;
let deslocamentoAcumulado = 0;


// ---------- Caixotes, nuvens e vidas ----------
const camadaObjetos = $("#objetos-cenario");
const VIDA_MAXIMA = 7;
const objetosCenario = [];
let tempoProximoObjeto = 3;
let tempoProximaFera = 5;
let tempoProximaNuvemClara = 12;
let tempoTotalObjetos = 0;
let sequenciaObjetos = 0;
let tempoProximoAmigo = 10;
let ladoProximaNuvem = 1;
let ladoProximaFera = 1;
let ladoProximaCaixa = 1;
const ferasAtivas = [];
const amigosAtivos = [];

const SEQUENCIAS_FERAS = [
    { nome: "Cão", direita: ["Cão3.png", "Cão4.png", "Cão5.png"], esquerda: ["Cão6.png", "Cão7.png", "Cão8.png"] },
    { nome: "Burro", direita: ["Burro2.png", "Burro4.png", "Burro3.png"], esquerda: ["Burro6.png", "Burro8.png", "Burro7.png"] },
    { nome: "Boi", direita: ["Boi3.png", "Boi4.png", "Boi5.png"], esquerda: ["Boi6.png", "Boi7.png", "Boi8.png"] },
    { nome: "Capivara", direita: ["Capivara3.png", "Capivara4.png", "Capivara5.png"], esquerda: ["Capivara6.png", "Capivara7.png", "Capivara8.png"] }
];
const SEQUENCIAS_AMIGOS = [
    { nome: "Wendy", direita: ["Wendy3.png", "Wendy4.png", "Wendy6.png"], esquerda: ["Wendy7.png", "Wendy8.png", "Wendy5.png"] },
    { nome: "Neneca", direita: ["Neneca3.png", "Neneca4.png", "Neneca5.png"], esquerda: ["Neneca6.png", "Neneca7.png", "Neneca8.png"] },
    { nome: "Zangão", direita: ["Zangão3.png", "Zangão4.png", "Zangão5.png"], esquerda: ["Zangão6.png", "Zangão7.png", "Zangão8.png"] },
    { nome: "Gregório", direita: ["Gregório6.png", "Gregório3.png", "Gregório4.png"], esquerda: ["Gregório5.png", "Gregório8.png", "Gregório7.png"] },
    { nome: "Robozinha", direita: ["Robozinha2.png", "Robozinha3.png", "Robozinha4.png"], esquerda: ["Robozinha2.png", "Robozinha3.png", "Robozinha4.png"] }
];

function limparObjetos() {
    objetosCenario.forEach((obj) => obj.elemento.remove());
    objetosCenario.length = 0;
    tempoProximoObjeto = 3;
    tempoProximaFera = 5;
    tempoProximaNuvemClara = 12;
    tempoTotalObjetos = 0;
    sequenciaObjetos = 0;
    tempoProximoAmigo = 10;
    ladoProximaNuvem = 1;
    ladoProximaFera = 1;
    ladoProximaCaixa = 1;
    ferasAtivas.forEach((item) => item.elemento.remove());
    amigosAtivos.forEach((item) => item.elemento.remove());
    ferasAtivas.length = 0;
    amigosAtivos.length = 0;
}

function criarObjetoCenario() {
    // Nuvens brancas continuam em um ciclo próprio de coleta.
    const elemento = document.createElement("div");
    elemento.className = "objeto-jogo objeto-nuvem-clara";
    elemento.setAttribute("aria-label", "Nuvem clara");
    const imagensNuvens = ["Verdade.png", "Restauração.png", "Perdão.png", "Graça.png", "Fé.png", "Nova Vida.png"];
    const imagem = document.createElement("img");
    imagem.src = imagensNuvens[Math.floor(Math.random() * imagensNuvens.length)];
    imagem.alt = "";
    imagem.draggable = false;
    imagem.onerror = () => elemento.remove();
    elemento.appendChild(imagem);
    elemento.style.left = `${cenario.clientWidth + 30}px`;
    const alturaCena = cenario.clientHeight || 500;
    const alturaNuvem = 96;
    const alturaPersonagem = personagem?.offsetHeight || 100;
    const alturaAlvo = Math.max(alturaPersonagem * 2, alturaCena * 0.62);
    elemento.style.bottom = `${Math.min(alturaAlvo, alturaCena - alturaNuvem - 12)}px`;
    camadaObjetos.appendChild(elemento);
    objetosCenario.push({ elemento, tipo: "nuvem-clara", x: cenario.clientWidth + 30, removido: false });
}

function criarCaixote() {
    const imagensCaixotes = ["FakeNews.png", "Agressão.png", "Violência.png", "Por.png", "Mentiras.png", "Ira.png", "Fúria.png", "Intolerância.png"];
    const elemento = document.createElement("div");
    elemento.className = "objeto-jogo objeto-caixote";
    elemento.setAttribute("aria-label", "Caixote");
    const imagem = document.createElement("img");
    imagem.src = imagensCaixotes[Math.floor(Math.random() * imagensCaixotes.length)];
    imagem.alt = "";
    imagem.draggable = false;
    imagem.onerror = () => { elemento.remove(); const falha = objetosCenario.find((obj) => obj.elemento === elemento); if (falha) falha.removido = true; };
    elemento.appendChild(imagem);
    const direcao = ladoProximaCaixa;
    ladoProximaCaixa *= -1;
    const x = direcao > 0 ? cenario.clientWidth + 30 : -90;
    elemento.style.left = `${x}px`;
    camadaObjetos.appendChild(elemento);
    objetosCenario.push({ elemento, tipo: "caixote", x, direcao, removido: false });
}

function criarNuvemNegra() {
    const imagens = [
        "Por3.png", "Intolerância3.png", "Violência3.png",
        "Ira3.png", "Mentira3.png", "FakeNews3.png", "Agressão3.png"
    ];
    const elemento = document.createElement("div");
    elemento.className = "objeto-jogo objeto-nuvem-negra";
    elemento.setAttribute("aria-hidden", "true");
    const imagem = document.createElement("img");
    imagem.src = imagens[Math.floor(Math.random() * imagens.length)];
    imagem.alt = "";
    imagem.draggable = false;
    imagem.onerror = () => {
        console.error(`Imagem de nuvem negra não encontrada: ${imagem.src}`);
        elemento.remove();
        const falha = objetosCenario.find((obj) => obj.elemento === elemento);
        if (falha) falha.removido = true;
    };
    elemento.appendChild(imagem);
    camadaObjetos.appendChild(elemento);

    // Alterna as entradas. A nuvem sempre atravessa a tela no sentido
    // em que Robozinho está voltado, vindo da borda oposta.
    const direcao = ladoProximaNuvem;
    const largura = elemento.offsetWidth || 120;
    const x = direcao > 0 ? -largura - 8 : cenario.clientWidth + 8;
    const objeto = {
        elemento, tipo: "nuvem-negra", x, direcao,
        velocidade: Math.max(172, fisica.velocidadeCenario * 1.5),
        removido: false
    };
    elemento.style.left = `${objeto.x}px`;
    ladoProximaNuvem *= -1;
    objetosCenario.push(objeto);
}

function criarFera() {
    const modelo = SEQUENCIAS_FERAS[Math.floor(Math.random() * SEQUENCIAS_FERAS.length)];
    // A fera sempre vem de encontro à direção para a qual Robozinho está apontado.
    // Se Robozinho olha para a direita, a fera entra pela direita e corre para a esquerda;
    // se olha para a esquerda, entra pela esquerda e corre para a direita.
    const direcao = -(ultimaDirecao || 1);
    ladoProximaFera = direcao;
    const elemento = document.createElement("div");
    elemento.className = "ator-movel ator-fera";
    const imagem = document.createElement("img");
    imagem.alt = modelo.nome;
    imagem.draggable = false;
    elemento.appendChild(imagem);
    camadaObjetos.appendChild(elemento);
    const largura = 94;
    const x = direcao > 0 ? -largura : cenario.clientWidth + 8;
    const ator = {
        elemento, imagem, modelo, x, direcao, quadro: 0, tempo: 0,
        velocidade: Math.max(70, fisica.velocidadeCenario * 0.5625), removido: false
    };
    // Use a sequência desenhada para o sentido real do deslocamento.
    // Não espelhar a sequência direita: isso fazia algumas feras parecerem andar de costas.
    const sequenciaInicial = direcao > 0 ? modelo.direita : modelo.esquerda;
    imagem.src = sequenciaInicial[0];
    elemento.style.left = `${x}px`;
    ferasAtivas.push(ator);
}

function criarAmigo() {
    const modelo = SEQUENCIAS_AMIGOS[Math.floor(Math.random() * SEQUENCIAS_AMIGOS.length)];
    // Amigos cruzam rapidamente a faixa superior, sem colisão com Robozinho.
    const direcao = Math.random() < 0.5 ? 1 : -1;
    const elemento = document.createElement("div");
    elemento.className = "ator-movel ator-amigo";
    const imagem = document.createElement("img");
    imagem.alt = modelo.nome;
    imagem.draggable = false;
    elemento.appendChild(imagem);
    camadaObjetos.appendChild(elemento);
    const x = direcao > 0 ? -100 : cenario.clientWidth + 10;
    const ator = {
        elemento, imagem, modelo, x, direcao, quadro: 0, tempo: 0,
        velocidade: Math.max(520, fisica.velocidadeCenario * 5.5), removido: false
    };
    imagem.src = (direcao > 0 ? modelo.direita : modelo.esquerda)[0];
    if (modelo.nome === "Robozinha" && direcao < 0) imagem.style.transform = "scaleX(-1)";
    elemento.style.left = `${x}px`;
    amigosAtivos.push(ator);
}

function atualizarAtoresMovel(lista, dt, tipo) {
    for (const ator of lista) {
        if (ator.removido) continue;
        ator.x += ator.direcao * ator.velocidade * dt;
        ator.tempo += dt;
        if (ator.tempo >= 0.11) {
            ator.quadro = (ator.quadro + 1) % 3;
            ator.tempo = 0;
            const sequencia = ator.direcao > 0 ? ator.modelo.direita : ator.modelo.esquerda;
            ator.imagem.src = sequencia[ator.quadro];
            // As feras já possuem quadros próprios para cada direção; não aplicar scaleX.
        }
        ator.elemento.style.left = `${ator.x}px`;
        if ((ator.direcao > 0 && ator.x > cenario.clientWidth + 110) ||
            (ator.direcao < 0 && ator.x < -120)) {
            ator.elemento.remove();
            ator.removido = true;
        }
    }
    for (let i = lista.length - 1; i >= 0; i--) {
        if (lista[i].removido) lista.splice(i, 1);
    }
}

function verificarColisaoFeras() {
    const robo = personagem.getBoundingClientRect();
    for (const fera of ferasAtivas) {
        if (fera.removido) continue;
        const ret = fera.elemento.getBoundingClientRect();
        const tocou = robo.left + 12 < ret.right - 12 && robo.right - 12 > ret.left + 12 &&
            robo.top + 10 < ret.bottom - 8 && robo.bottom - 8 > ret.top + 8;
        if (tocou) {
            atualizarVidas(-1, `O ${fera.modelo.nome} atingiu Robozinho! Você perdeu uma vida.`);
            fera.elemento.remove();
            fera.removido = true;
        }
    }
    for (let i = ferasAtivas.length - 1; i >= 0; i--) {
        if (ferasAtivas[i].removido) ferasAtivas.splice(i, 1);
    }
}

function removerObjeto(objeto) {
    objeto.elemento.remove();
    objeto.removido = true;
}

function atualizarVidas(delta, motivo) {
    if (delta < 0 && performance.now() < fisica.invulneravelAte) return;
    const antes = fisica.vidas;
    fisica.vidas = Math.max(0, Math.min(VIDA_MAXIMA, fisica.vidas + delta));
    if (delta < 0) fisica.invulneravelAte = performance.now() + 1400;
    atualizarHUD();

    if (fisica.vidas < antes) {
        mensagemFase.textContent = motivo || "Você perdeu uma vida! Continue com cuidado.";
    } else if (fisica.vidas > antes) {
        mensagemFase.textContent = motivo || "Você conquistou uma vida!";
    }

    if (fisica.vidas <= 0) {
        pararFase();
        mostrarTela("tela-game-over");
    }
}

function verificarColisoesObjetos() {
    const robo = personagem.getBoundingClientRect();
    for (const objeto of objetosCenario) {
        if (objeto.removido) continue;
        const ret = objeto.elemento.getBoundingClientRect();
        const tocou = robo.left < ret.right && robo.right > ret.left &&
            robo.top < ret.bottom && robo.bottom > ret.top;
        if (!tocou) continue;

        if (objeto.tipo === "nuvem-clara") {
            atualizarVidas(1, "Nuvem branca! Você conquistou uma vida.");
            removerObjeto(objeto);
        } else if (objeto.tipo === "caixote") {
            if (fisica.alturaPulo < 28) {
                atualizarVidas(-1, "Você bateu em um caixote e perdeu uma vida.");
                removerObjeto(objeto);
            }
        } else if (objeto.tipo === "nuvem-negra") {
            atualizarVidas(-1, "Uma nuvem negra atingiu você! Cuidado.");
            removerObjeto(objeto);
        }
    }
    for (let i = objetosCenario.length - 1; i >= 0; i--) {
        if (objetosCenario[i].removido) objetosCenario.splice(i, 1);
    }
}

function iniciarTrechoCelestial() {
    if (fisica.fase < 7 || passagensCelestiais >= 2 || etapaEscada !== "nenhuma") return;
    passagensCelestiais += 1;
    etapaEscada = "subindo";
    tempoEtapaEscada = 0;
    camadaCelestial = document.createElement("div");
    camadaCelestial.className = "camada-celestial";
    camadaCelestial.innerHTML = '<img class="estrada-celestial" src="EstradadoCeu.png" alt=""><img class="escada-celestial" src="Escada2.png" alt=""><img class="fogo-celestial" src="Fogo.png" alt="">';
    cenario.appendChild(camadaCelestial);
}

function atualizarTrechoCelestial(dt) {
    if (fisica.fase < 7) return;
    // Duas travessias curtas por fase, iniciadas durante a progressão.
    const gatilhos = [1400, 3300];
    if (etapaEscada === "nenhuma" && passagensCelestiais < 2 && fisica.posicaoCenario >= gatilhos[passagensCelestiais]) iniciarTrechoCelestial();
    if (etapaEscada === "nenhuma") return;
    tempoEtapaEscada += dt;
    if (etapaEscada === "subindo" && tempoEtapaEscada >= 2.5) {
        emEstradaCelestial = true;
        etapaEscada = "em-cima";
        tempoEtapaEscada = 0;
        if (camadaCelestial) {
            camadaCelestial.classList.add("no-alto");
            const escada = camadaCelestial.querySelector(".escada-celestial");
            if (escada) escada.src = "Escada3.png";
        }
        personagens.classList.add("personagem-no-alto");
        mensagemFase.textContent = "Robozinho alcançou a estrada celestial!";
    } else if (etapaEscada === "em-cima" && tempoEtapaEscada >= 10) {
        etapaEscada = "descendo";
        tempoEtapaEscada = 0;
        emEstradaCelestial = false;
        personagens.classList.remove("personagem-no-alto");
        if (camadaCelestial) camadaCelestial.classList.remove("no-alto");
    } else if (etapaEscada === "descendo" && tempoEtapaEscada >= 2.5) {
        etapaEscada = "nenhuma";
        tempoEtapaEscada = 0;
        if (camadaCelestial) camadaCelestial.remove();
        camadaCelestial = null;
        mensagemFase.textContent = "De volta à estrada!";
    }
}

function atualizarObjetos(dt) {
    tempoTotalObjetos += dt;
    tempoProximoObjeto -= dt;
    tempoProximaFera -= dt;
    tempoProximaNuvemClara -= dt;
    tempoProximoAmigo -= dt;

    // Caixotes e nuvens negras mantêm seu próprio ciclo de três segundos.
    if (tempoProximoObjeto <= 0) {
        if (!objetosCenario.some((item) => !item.removido && item.tipo === "caixote")) criarCaixote();
        if (!objetosCenario.some((item) => !item.removido && item.tipo === "nuvem-negra")) criarNuvemNegra();
        tempoProximoObjeto = 3;
    }

    // Feras aparecem separadamente, com intervalo de cinco segundos.
    // Não cria outra enquanto a anterior ainda estiver atravessando a tela.
    if (tempoProximaFera <= 0) {
        if (ferasAtivas.length === 0) {
            criarFera();
            tempoProximaFera = 5;
        } else {
            tempoProximaFera = 1;
        }
    }

    // Uma nuvem branca por vez e intervalo maior entre coletas.
    if (tempoProximaNuvemClara <= 0) {
        const nuvemClaraAtiva = objetosCenario.some(
            (item) => !item.removido && item.tipo === "nuvem-clara"
        );
        if (!emEstradaCelestial && !nuvemClaraAtiva) {
            criarObjetoCenario();
            tempoProximaNuvemClara = 12;
        } else {
            tempoProximaNuvemClara = 12;
        }
    }
    if (tempoProximoAmigo <= 0) {
        criarAmigo();
        tempoProximoAmigo = 10;
    }

    for (const objeto of objetosCenario) {
        if (objeto.removido) continue;
        if (objeto.tipo === "nuvem-negra") {
            objeto.x += objeto.direcao * objeto.velocidade * dt;
            if ((objeto.direcao > 0 && objeto.x > cenario.clientWidth + 140) ||
                (objeto.direcao < 0 && objeto.x < -150)) removerObjeto(objeto);
        } else if (objeto.tipo === "caixote") {
            objeto.x += (objeto.direcao > 0 ? -1 : 1) * (fisica.deltaAvanco || 0);
            if ((objeto.direcao > 0 && objeto.x < -160) ||
                (objeto.direcao < 0 && objeto.x > cenario.clientWidth + 100)) removerObjeto(objeto);
        } else {
            objeto.x -= (fisica.deltaAvanco || 0);
            if (objeto.x < -160) removerObjeto(objeto);
        }
        objeto.elemento.style.left = `${objeto.x}px`;
    }
    atualizarAtoresMovel(ferasAtivas, dt, "fera");
    atualizarAtoresMovel(amigosAtivos, dt, "amigo");
    verificarColisoesObjetos();
    verificarColisaoFeras();
    for (let i = objetosCenario.length - 1; i >= 0; i--) {
        if (objetosCenario[i].removido) objetosCenario.splice(i, 1);
    }
}

function acertarObjetoComBiblia(biblia) {
    if (!biblia || !biblia.isConnected) return;

    const tiro = biblia.getBoundingClientRect();

    // A Bíblia pode destruir qualquer caixa ou nuvem negra que tocar.
    for (const objeto of objetosCenario) {
        if (objeto.removido || !["caixote", "nuvem-negra"].includes(objeto.tipo)) continue;
        const alvo = objeto.elemento.getBoundingClientRect();
        const atingiu = tiro.left <= alvo.right && tiro.right >= alvo.left &&
            tiro.top <= alvo.bottom && tiro.bottom >= alvo.top;
        if (atingiu) removerObjeto(objeto);
    }

    // Percorre todas as feras, sem depender do nome ou da ordem da lista.
    // Isso inclui expressamente a Capivara.
    for (const fera of ferasAtivas) {
        if (fera.removido) continue;
        const alvo = fera.elemento.getBoundingClientRect();
        const atingiu = tiro.left <= alvo.right && tiro.right >= alvo.left &&
            tiro.top <= alvo.bottom && tiro.bottom >= alvo.top;
        if (atingiu) {
            fera.elemento.remove();
            fera.removido = true;
        }
    }
}

// ---------- Preparação da fase ----------

function atualizarHUD() {
    indicadorVidas.textContent = `Vidas: ${fisica.vidas}`;
    indicadorFase.textContent = `Fase ${fisica.fase} de 10`;
}

function prepararFase(fase = fisica.fase) {
    limparObjetos();
    jogoPausado = false;
    $("#tela-pausa").hidden = true;
    $("#btn-pausar").textContent = "Pausar";
    $("#btn-pausar").setAttribute("aria-pressed", "false");
    fisica.fase = fase;
    fisica.velocidadeCenario = 95 + (fase - 1) * 18;
    carregarCenario(fase);
    teclas.clear();

    fisica.velocidadeX = 0;
    fisica.posicaoX = Math.max(40, cenario.clientWidth * 0.30);
    fisica.velocidadeY = 0;
    fisica.alturaPulo = 0;
    fisica.noChao = true;
    fisica.agachado = false;
    fisica.bibliaAtiva = false;
    fisica.faseIniciada = false;
    fisica.tempoFase = 0;
    fisica.posicaoCenario = 0;
    deslocamentoAcumulado = 0;
    fisica.deltaAvanco = 0;
    emEstradaCelestial = false;
    etapaEscada = "nenhuma";
    tempoEtapaEscada = 0;
    passagensCelestiais = 0;
    if (camadaCelestial) camadaCelestial.remove();
    camadaCelestial = null;
    personagens.classList.remove("personagem-no-alto");
    fisica.vidas = 7;
    fisica.invulneravelAte = 0;
    ultimaDirecao = 1;
    jaSeMoveu = false;

    personagens.style.left = "0px";
    personagens.style.right = "auto";
    personagens.style.bottom = "85px";

    personagem.src = "Robozinho1.png";
    personagem.style.transform = "translateY(0) scaleY(1)";
    personagem.style.filter = "none";
    personagem.style.opacity = "1";

    cenario.style.backgroundPosition = "0px center";

    removerBiblia();
    atualizarHUD();

    mensagemFase.textContent =
        "Pressione uma tecla ou um controle para começar!";
}

function iniciarFase(fase = fisica.fase) {
    pararFase();
    prepararFase(fase);
    mostrarTela("tela-jogo");
    quadroAnimacao = requestAnimationFrame(loopJogo);
}

function pararFase() {
    if (quadroAnimacao) {
        cancelAnimationFrame(quadroAnimacao);
        quadroAnimacao = 0;
    }

    teclas.clear();
    fisica.faseIniciada = false;
    fisica.ultimoTempo = 0;
    removerBiblia();
}

// ---------- Teclado ----------

function normalizarTecla(tecla) {
    if (tecla === " ") return "space";
    return tecla.toLowerCase();
}

function comandoDaTecla(tecla) {
    const mapa = {
        a: "esquerda",
        arrowleft: "esquerda",
        d: "direita",
        arrowright: "direita",
        w: "pular",
        arrowup: "pular",
        s: "agachar",
        arrowdown: "agachar",
        space: "biblia",
        f: "biblia"
    };

    return mapa[tecla] || null;
}

document.addEventListener("keydown", (evento) => {
    if ($("#tela-jogo").hidden) return;

    const tecla = normalizarTecla(evento.key);
    const comando = comandoDaTecla(tecla);

    if (!comando) return;

    evento.preventDefault();

    if (evento.repeat && comando === "pular") {
        return;
    }

    teclas.add(comando);

    if (!fisica.faseIniciada) {
        fisica.faseIniciada = true;
        fisica.ultimoTempo = performance.now();
        mensagemFase.textContent = "";
    }

    if (comando === "pular") iniciarPulo();
    if (comando === "biblia") lancarBiblia();
});

document.addEventListener("keyup", (evento) => {
    const tecla = normalizarTecla(evento.key);
    const comando = comandoDaTecla(tecla);

    if (!comando) return;

    teclas.delete(comando);

    if (comando === "pular") tempoPulo = 0;
});

// Evita que uma tecla fique presa ao trocar de janela.
window.addEventListener("blur", () => {
    teclas.clear();
    tempoPulo = 0;
    ponteirosAtivos.clear();
});

// ---------- Controles de celular ----------

function ligarControle(id, comando, aoPressionar) {
    const botao = document.getElementById(id);
    if (!botao) return;

    botao.style.touchAction = "none";

    botao.addEventListener("pointerdown", (evento) => {
        evento.preventDefault();
        // Map por ponteiro permite pressionar, por exemplo, direita + pulo + Bíblia
        // simultaneamente em telas sensíveis ao toque.
        if (ponteirosAtivos.has(evento.pointerId)) return;
        ponteirosAtivos.set(evento.pointerId, comando);
        try { botao.setPointerCapture(evento.pointerId); } catch (_) {}
        teclas.add(comando);

        if (!fisica.faseIniciada) {
            fisica.faseIniciada = true;
            fisica.ultimoTempo = performance.now();
            mensagemFase.textContent = "";
        }
        if (aoPressionar) aoPressionar();
    });

    function soltar(evento) {
        const comandoLiberado = ponteirosAtivos.get(evento.pointerId);
        if (!comandoLiberado) return;
        ponteirosAtivos.delete(evento.pointerId);
        // Só libera o comando quando nenhum outro dedo ainda o mantém pressionado.
        if (![...ponteirosAtivos.values()].includes(comandoLiberado)) {
            teclas.delete(comandoLiberado);
        }
    }

    botao.addEventListener("pointerup", soltar);
    botao.addEventListener("pointercancel", soltar);
    botao.addEventListener("lostpointercapture", soltar);
}

ligarControle("btn-esquerda", "esquerda");
ligarControle("btn-direita", "direita");
// O botão de agachar foi removido da interface móvel.
ligarControle("btn-pular", "pular", iniciarPulo);
ligarControle("btn-biblia", "biblia", lancarBiblia);

// Em celulares, prioriza a orientação horizontal. O bloqueio é tentado
// após um gesto do jogador; quando o navegador não permite, o aviso permanece.
function ehDispositivoMovel() {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
        window.matchMedia("(pointer: coarse)").matches;
}

async function solicitarTelaHorizontal() {
    if (!ehDispositivoMovel()) return;

    try {
        // Alguns navegadores só aceitam orientation.lock em tela cheia.
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
        }
    } catch (_) {
        // Tela cheia pode ser bloqueada; ainda tentaremos a orientação.
    }

    try {
        if (screen.orientation && screen.orientation.lock) {
            await screen.orientation.lock("landscape");
        }
    } catch (_) {
        // O navegador pode não permitir bloqueio; o aviso orienta o jogador.
    }
    atualizarAvisoOrientacao();
}

function atualizarAvisoOrientacao() {
    if (!ehDispositivoMovel()) return;

    let aviso = document.getElementById("aviso-gire-aparelho");
    if (!aviso) {
        aviso = document.createElement("div");
        aviso.id = "aviso-gire-aparelho";
        aviso.setAttribute("role", "status");
        aviso.innerHTML = `
            <div class="aviso-orientacao-cartao">
                <div class="aviso-orientacao-icone" aria-hidden="true">↻</div>
                <strong>Vire seu celular!</strong>
                <p>Para jogar Renova-me: A Jornada, coloque o aparelho na posição horizontal.</p>
                <span>Aguardando orientação horizontal</span>
            </div>`;
        document.body.appendChild(aviso);
    }
    const estaNaHorizontal = window.matchMedia("(orientation: landscape)").matches;
    aviso.hidden = estaNaHorizontal;
}

window.addEventListener("orientationchange", atualizarAvisoOrientacao);
window.addEventListener("resize", atualizarAvisoOrientacao);
document.addEventListener("DOMContentLoaded", atualizarAvisoOrientacao);

// A solicitação ocorre no primeiro gesto de navegação/início, quando há
// permissão do navegador para tela cheia e bloqueio de orientação.
document.getElementById("btn-jogar")?.addEventListener("click", solicitarTelaHorizontal);
document.getElementById("btn-continuar")?.addEventListener("click", solicitarTelaHorizontal);
document.getElementById("btn-pular")?.addEventListener("pointerdown", solicitarTelaHorizontal);

// Evita menus de toque, arraste e seleção de imagens durante a partida.
document.addEventListener("contextmenu", (evento) => {
    if (evento.target.closest("#controles-jogo, #cenario, #personagens, #tela-jogo")) {
        evento.preventDefault();
    }
});
document.addEventListener("dragstart", (evento) => {
    if (evento.target.closest("#controles-jogo, #cenario, #personagens, #tela-jogo") ||
        evento.target.tagName === "IMG") evento.preventDefault();
});
document.addEventListener("selectstart", (evento) => {
    if (evento.target.closest("#tela-jogo")) evento.preventDefault();
});

// Evita menu de contexto, arraste/baixar imagem e seleção durante a partida.
document.addEventListener("contextmenu", (evento) => {
    if (evento.target.closest("#controles-jogo, #cenario, #personagens")) evento.preventDefault();
});
document.addEventListener("dragstart", (evento) => {
    if (evento.target.closest("#controles-jogo, #cenario, #personagens") || evento.target.tagName === "IMG") evento.preventDefault();
});

// ---------- Pulo com altura variável ----------

function iniciarPulo() {
    if (!fisica.faseIniciada || !fisica.noChao) return;

    fisica.noChao = false;
    fisica.velocidadeY = -fisica.impulsoPulo;
    tempoPulo = 0;
}

function atualizarPulo(dt) {
    if (!fisica.noChao) {
        // Segurar o comando aumenta moderadamente a altura do salto.
        if (teclas.has("pular") && tempoPulo < 0.32 &&
            fisica.velocidadeY < -100) {
            fisica.velocidadeY -= 800 * dt;
            tempoPulo += dt;
        }

        fisica.velocidadeY += fisica.gravidade * dt;
        fisica.alturaPulo += fisica.velocidadeY * dt;

        if (fisica.alturaPulo >= 0) {
            fisica.alturaPulo = 0;
            fisica.velocidadeY = 0;
            fisica.noChao = true;
            tempoPulo = 0;
        }
    }
}

// ---------- Lançamento da Bíblia ----------

function lancarBiblia() {
    const agora = performance.now();
    if (agora - ultimoLancamento < 180) return;
    ultimoLancamento = agora;
    if (!fisica.faseIniciada) return;

    // Cada disparo guarda a direção atual de Robozinho no momento do clique.
    // Disparos anteriores continuam voando independentemente.
    const direcao = ultimaDirecao || 1;
    const biblia = document.createElement("div");
    biblia.textContent = "📖";
    biblia.setAttribute("role", "img");
    biblia.setAttribute("aria-label", "Bíblia lançada");
    biblia.className = "biblia-projetil";
    const larguraBiblia = 38;
    const alturaBiblia = 38;
    const inicioX = direcao > 0
        ? fisica.posicaoX + personagem.offsetWidth - 4
        : fisica.posicaoX - larguraBiblia + 4;
    const alturaInicial = fisica.alturaPulo;
    Object.assign(biblia.style, {
        position: "absolute", left: `${inicioX}px`,
        bottom: `${100 - alturaInicial}px`,
        width: `${larguraBiblia}px`, height: `${alturaBiblia}px`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "30px", lineHeight: "1", zIndex: "5", pointerEvents: "none"
    });
    cenario.appendChild(biblia);
    bibliasAtivas.add(biblia);

    let x = inicioX;
    const velocidade = 480 * direcao;
    let anterior = performance.now();

    function moverBiblia(agoraFrame) {
        if (!biblia.isConnected || $("#tela-jogo").hidden) {
            bibliasAtivas.delete(biblia);
            return;
        }
        const dt = Math.min((agoraFrame - anterior) / 1000 || 1 / 60, 0.04);
        anterior = agoraFrame;
        x += velocidade * dt;
        biblia.style.left = `${x}px`;

        acertarObjetoComBiblia(biblia);

        if ((direcao > 0 && x > cenario.clientWidth + 50) ||
            (direcao < 0 && x < -larguraBiblia - 50)) {
            biblia.remove();
            bibliasAtivas.delete(biblia);
            return;
        }
        requestAnimationFrame(moverBiblia);
    }
    requestAnimationFrame(moverBiblia);
}

function removerBiblia() {
    for (const biblia of bibliasAtivas) {
        if (biblia.isConnected) biblia.remove();
    }
    bibliasAtivas.clear();
    if (idBiblia && idBiblia.isConnected) idBiblia.remove();
    idBiblia = null;
    fisica.bibliaAtiva = false;
}

// ---------- Física horizontal e cenário ----------


function atualizarMovimento(dt) {
    let direcao = 0;

    if (teclas.has("esquerda")) direcao -= 1;
    if (teclas.has("direita")) direcao += 1;

    if (direcao !== 0) {
        ultimaDirecao = direcao > 0 ? 1 : -1;
        jaSeMoveu = true;
        fisica.velocidadeX += direcao * fisica.aceleracao * dt;
    } else {
        const reducao = fisica.desaceleracao * dt;

        if (Math.abs(fisica.velocidadeX) <= reducao) {
            fisica.velocidadeX = 0;
        } else {
            fisica.velocidadeX -=
                Math.sign(fisica.velocidadeX) * reducao;
        }
    }

    fisica.velocidadeX = Math.max(
        -fisica.velocidadeMaxima,
        Math.min(fisica.velocidadeMaxima, fisica.velocidadeX)
    );

    // Teste de progressão: Robozinho avança pela tela; ao alcançar a metade,
    // o mundo começa a rolar. O cenário nunca retrocede quando ele volta.
    fisica.deltaAvanco = 0;
    fisica.posicaoX += fisica.velocidadeX * dt;
    const limiteEsquerdo = 10;
    const limiteDireito = Math.max(limiteEsquerdo, cenario.clientWidth * 0.5 - personagem.clientWidth / 2);
    if (fisica.posicaoX > limiteDireito) {
        const excesso = fisica.posicaoX - limiteDireito;
        fisica.posicaoX = limiteDireito;
        deslocamentoAcumulado += excesso;
        fisica.deltaAvanco = excesso;
        fisica.posicaoCenario = deslocamentoAcumulado;
    }
    fisica.posicaoX = Math.max(limiteEsquerdo, fisica.posicaoX);

    // Calcula a largura de cada imagem na altura atual do cenário.
    const altura = cenario.clientHeight;

    
const imagensDaSequencia = imagensFaixa.slice(0, 4);
const imagensProntas = imagensDaSequencia.length === 4 &&
    imagensDaSequencia.every((imagem) => imagem.complete && imagem.naturalWidth > 0);

if (imagensProntas) {
    const altura = cenario.clientHeight;
    const larguraVolta = imagensDaSequencia.reduce((soma, imagem) =>
        soma + imagem.naturalWidth * altura / imagem.naturalHeight, 0);

    if (larguraVolta > 0) {
        // O deslocamento reinicia exatamente no começo da segunda cópia.
        const deslocamento = fisica.posicaoCenario % larguraVolta;
        faixaCenario.style.transform = `translate3d(${-deslocamento}px, 0, 0)`;
    }
}


    personagens.style.left = `${fisica.posicaoX}px`;

    fisica.agachado = teclas.has("agachar");

    
    const comandoEsquerda = teclas.has("esquerda");
    const comandoDireita = teclas.has("direita");

    const comandoMovimento =
        comandoEsquerda || comandoDireita;

    const correndo =
        comandoMovimento &&
        fisica.noChao &&
        !fisica.agachado;

    if (correndo) {
        tempoAnimacaoCorrida += dt;

        if (tempoAnimacaoCorrida >= 0.14) {
            quadroCorrida = 1 - quadroCorrida;
            tempoAnimacaoCorrida = 0;
        }

        if (comandoDireita && !comandoEsquerda) {
            personagem.src = quadroCorrida === 0
                ? "Robozinho2.png"
                : "Robozinho3.png";
        } else if (comandoEsquerda && !comandoDireita) {
            personagem.src = quadroCorrida === 0
                ? "Robozinho6.png"
                : "Robozinho7.png";
        }
    } else {
        tempoAnimacaoCorrida = 0;
        quadroCorrida = 0;

        if (fisica.agachado && fisica.noChao) {
            personagem.src = "Robozinho9.png";
        } else if (jaSeMoveu) {
            // Depois do primeiro movimento, Robozinho permanece de perfil
            // quando para, olhando para o último sentido em que correu.
            personagem.src = ultimaDirecao > 0 ? "Robozinho4.png" : "Robozinho5.png";
        } else {
            // De frente somente na apresentação inicial da fase.
            personagem.src = "Robozinho1.png";
        }
    }

    const escalaY = fisica.agachado && fisica.noChao ? 0.65 : 1;

    personagem.style.transform =
        `translateY(${fisica.alturaPulo}px) scaleY(${escalaY})`;

    const inclinacao = Math.max(
        -7,
        Math.min(7, fisica.velocidadeX / 45)
    );

    personagem.style.filter = "none";
    personagem.style.transform += ` rotate(${inclinacao}deg)`;
}


// ---------- Cronômetro da cena ----------

function loopJogo(agora) {
    if ($("#tela-jogo").hidden) {
        pararFase();
        return;
    }

    if (jogoPausado) {
        fisica.ultimoTempo = agora;
        quadroAnimacao = requestAnimationFrame(loopJogo);
        return;
    }

    if (!fisica.ultimoTempo) fisica.ultimoTempo = agora;

    const dt = Math.min((agora - fisica.ultimoTempo) / 1000, 0.035);
    fisica.ultimoTempo = agora;

    if (fisica.faseIniciada) {
        fisica.tempoFase += dt;

        atualizarMovimento(dt);
        atualizarTrechoCelestial(dt);
        atualizarPulo(dt);
        atualizarObjetos(dt);

        // Mantém a duração já definida: dois minutos e trinta segundos.
        if (fisica.tempoFase >= 300) {
            pararFase();
            mostrarTela("tela-final");
            return;
        }
    }

    quadroAnimacao = requestAnimationFrame(loopJogo);
}

// ---------- Inicialização ----------

mostrarTela("tela-inicial");
