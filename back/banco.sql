-- =====================================================================
-- Banco de Dados — Sistema de Registro de Atrasos (SENAI)
-- Motor: MySQL 8+
-- Baseado em: Banco_de_dados_mariana.xls
-- =====================================================================

CREATE DATABASE IF NOT EXISTS registro_atrasos
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE registro_atrasos;

-- ---------------------------------------------------------------------
-- Tabela: turmas
-- Referência de tipo de curso / curso / turma (vinda da planilha)
-- ---------------------------------------------------------------------
CREATE TABLE turmas (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    tipo_curso    VARCHAR(100) NOT NULL,
    curso         VARCHAR(150) NOT NULL,
    codigo_turma  VARCHAR(50)  NOT NULL,
    criado_em     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_turmas_codigo (codigo_turma)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Tabela: alunos
-- Nº de Matrícula, Nome e CPF vêm vazios na planilha — são preenchidos
-- pelo sistema a cada novo aluno registrado (manual ou por voz).
-- CPF é guardado só com dígitos (11 chars); formatação (000.000.000-00)
-- fica por conta da camada de apresentação, evitando duplicidade por
-- diferença de máscara.
-- ---------------------------------------------------------------------
CREATE TABLE alunos (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    matricula   VARCHAR(20) NOT NULL,
    nome        VARCHAR(150) NOT NULL,
    cpf         CHAR(11) NOT NULL,
    turma_id    INT NOT NULL,
    criado_em   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_alunos_matricula (matricula),
    UNIQUE KEY uk_alunos_cpf (cpf),
    CONSTRAINT fk_alunos_turma FOREIGN KEY (turma_id) REFERENCES turmas(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Tabela: registros_atraso
-- origem_registro distingue registro feito manualmente do feito pela
-- futura API de voz (accessibility/auditoria).
-- ---------------------------------------------------------------------
CREATE TABLE registros_atraso (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    aluno_id         INT NOT NULL,
    tipo             ENUM('Atraso', 'Saída Adiantada') NOT NULL,
    data_registro    DATE NOT NULL,
    horario_registro TIME NOT NULL,
    origem_registro  ENUM('Manual', 'Voz') NOT NULL DEFAULT 'Manual',
    criado_em        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_registros_aluno FOREIGN KEY (aluno_id) REFERENCES alunos(id),
    INDEX idx_registros_aluno_data (aluno_id, data_registro)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Dados de referência extraídos da planilha original
-- ---------------------------------------------------------------------
INSERT INTO turmas (tipo_curso, curso, codigo_turma) VALUES
    ('Aprendizagem Industrial', 'Mecânico de Manutenção', 'M2M'),
    ('Itinerário de Formação Técnica e Profissional', 'Técnico em Mecatrônica', 'MECASESI2126'),
    ('Curso Técnico', 'Técnico em Mecatrônica', 'MECACCR4226');