# Projeto-Mariana
## Sistema de Registro e Frequência Acessível

Um sistema prático e inclusivo voltado para o cadastro de participantes e acompanhamento de frequência, projetado com foco nas diretrizes de acessibilidade web.

## Funcionalidades

- Cadastro de Usuários: Registro simples e rápido de participantes.

- Controle de Frequência: Marcação e consulta de presenças e ausências.

- Interface Acessível: Design adaptado para navegação via teclado e leitura por tecnologias assistivas (leitores de tela).

- Visualização de Dados: Painel intuitivo para acompanhamento de relatórios de presença.

## Tecnologias
- Frontend: HTML5, CSS3 (Tailwind CSS) e JavaScript

- Acessibilidade: Atributos ARIA, alto contraste e elementos semânticos

## Configuração da API
Para compartilhar registros entre dispositivos, defina API_URL em Proto/config.js com a URL do endpoint de registros. O endpoint deve aceitar POST com um registro JSON e responder a GET com uma lista JSON de registros. Sem URL configurada, o sistema opera somente com o cache local do navegador.
