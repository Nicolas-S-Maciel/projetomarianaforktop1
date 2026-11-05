<div align="center">

<img src="https://upload.wikimedia.org/wikipedia/commons/8/8c/SENAI_S%C3%A3o_Paulo_logo.png" alt="Logo SENAI" width="300" />

# MarianaSRA
### **Sistema de Registro e Frequência Acessível**

*Plataforma inclusiva e automatizada para controle de presença e pontualidade de alunos no SENAI, projetada nativamente com interatividade total por voz (reconhecimento via microfone e áudio-guia em tempo real).*

[![SENAI](https://img.shields.io/badge/SENAI-Qualidade_de_Vida-e3262e?style=for-the-badge)](https://www.sp.senai.br/)
[![Java](https://img.shields.io/badge/Java-24-1a365d?style=for-the-badge&logo=openjdk)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.x-6db33f?style=for-the-badge&logo=springboot)](https://spring.io/projects/spring-boot)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-00618a?style=for-the-badge&logo=mysql)](https://www.mysql.com/)

---

</div>

## 👥 Equipe do Projeto Integrador

- **João Demutti**
- **Lucas Daniel**
- **Murilo Abila**
- **Murilo Amorim**
- **Nícolas Maciel**
- **Thiago Caetano**

---

## 📌 Sobre o Projeto

O **MarianaSRA** foi concebido no âmbito do **SENAI** para modernizar o atendimento no setor de Qualidade de Vida escolar, eliminando os gargalos do registro manual em papel e prevenindo perdas de tempo nas aulas[cite: 5].

O grande diferencial da aplicação é a sua **autonomia por voz para alunos com deficiência visual ou baixa visão**, integrando o programa **Incluir para Evoluir**[cite: 10]. O sistema evoluiu do modelo tradicional por teclado para uma **interação 100% por microfone (Speech-to-Text)**, permitindo que o aluno dite suas informações e veja o formulário ser preenchido automaticamente pela aplicação.

---

## 🎨 Identidade Visual SENAI

O sistema adota estritamente os padrões visuais da marca SENAI na sua interface de usuário:

| Elemento | Cor / Código Hex | Aplicação no Sistema |
| :--- | :--- | :--- |
| **Vermelho SENAI** | `#E3262E` | Botões de ação principal (`btn-submit`), destaques e alertas |
| **Azul Institucional** | `#1A365D` | Barra de rodapé e cabeçalhos de destaque |
| **Cinza Neutro** | `#F4F6F9` | Fundo das telas e áreas de descanso visual |
| **Branco Neve** | `#FFFFFF` | Cartões centrais de formulário e conteúdos |

---

## ✨ Funcionalidades Principais

- 🎙️ **Entrada por Microfone (Speech-to-Text):** O aluno fala diretamente no microfone seu **Nome**, **CPF** e **Tipo de Atraso**, e o sistema reconhece os dados preenchendo os campos automaticamente.
- 🔊 **Áudio-Guia Integrado (Text-to-Speech):** A cada passo, a *Web Speech API* orienta o estudante e confirma os dados ditados com leitura audível[cite: 10].
- ⚡ **Autocompletar Inteligente:** Preenchimento assistido a partir do reconhecimento de voz e histórico/cadastro do aluno.
- 🆔 **Validação e Formatação de CPF:** Tratamento automático dos números ditados para cálculo de dígitos verificadores e formatação dinâmica (`000.000.000-00`).
- ⏱️ **Registro Rápido:** Marcações instantâneas para **Atraso** e **Saída Adiantada**.
- 📊 **Painel de Relatórios:** Consulta de acessos para acompanhamento da equipe de gestão escolar[cite: 6].
- 🛡️ **Fallback Local (Offline-first):** Suporte a cache local no navegador (`localStorage`) em caso de oscilação de rede[cite: 9].

---

## 🛠️ Stack Técnica

| Camada | Tecnologias Utilizadas |
| :--- | :--- |
| **Frontend** | HTML5 Semântico, CSS3 (Estilo SENAI), JavaScript Vanilla[cite: 9, 10] |
| **Acessibilidade por Voz** | Web Speech API (`SpeechRecognition` e `SpeechSynthesis`)[cite: 10] |
| **Backend** | Java (JDK 17/24), Spring Boot, Spring Data JPA, Hibernate, Tomcat (`8080`)[cite: 9] |
| **Banco de Dados** | MySQL Server 8.0+[cite: 9] |
| **Arquitetura** | REST API (JSON)[cite: 9] |

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- [Java JDK 17+](https://www.oracle.com/java/technologies/downloads/)
- [MySQL Server](https://dev.mysql.com/downloads/installer/)
- [VS Code](https://code.visualstudio.com/) com extensões de Java

---

### 1. Preparação da Base de Dados
No terminal do MySQL ou MySQL Workbench, execute:
```sql
CREATE DATABASE db_marianasra;
