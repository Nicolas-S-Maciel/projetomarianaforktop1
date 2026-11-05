/* Configuração dinâmica da API do MarianoSRA */
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const isSpringPort = window.location.port === "8080";

window.APP_CONFIG = {
    // Se estiver rodando no Spring Boot local (porta 8080), usa URL completa.
    // Na Vercel ou na nuvem (HTTPS), usa endpoint relativo "/api/frequencia/registrar".
    API_URL: (isLocal && isSpringPort) 
        ? "http://localhost:8080/api/frequencia/registrar"
        : "/api/frequencia/registrar"
};
