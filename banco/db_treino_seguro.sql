-- =============================================================================
-- PROJETO  : Sistema Web para Prevencao de Lesoes na Musculacao (TG)
-- ARQUIVO  : db_treino_seguro.sql
-- SGBD     : MySQL 8.4 (testado na 8.4.9). Requer 8.0.16+ para que as
--            restricoes CHECK sejam efetivamente aplicadas.
-- DESCRICAO: Script DDL de criacao do banco, tabelas, relacionamentos, indices
--            e carga inicial de dados (grupo_muscular e exercicio).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. CRIACAO DO BANCO DE DADOS
-- -----------------------------------------------------------------------------
DROP DATABASE IF EXISTS db_treino_seguro;

CREATE DATABASE db_treino_seguro
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_general_ci;

USE db_treino_seguro;

-- =============================================================================
-- NIVEL 1 - TABELAS INDEPENDENTES (sem chaves estrangeiras)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. grupo_muscular
--    Catalogo dos grupos musculares (Peito, Costas, Pernas, etc.).
-- -----------------------------------------------------------------------------
CREATE TABLE grupo_muscular (
    id_grupo_muscular   INT           NOT NULL AUTO_INCREMENT,
    nome                VARCHAR(50)   NOT NULL,

    CONSTRAINT pk_grupo_muscular PRIMARY KEY (id_grupo_muscular),
    CONSTRAINT uk_grupo_muscular_nome UNIQUE (nome)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- -----------------------------------------------------------------------------
-- 2. usuario
--    Praticantes cadastrados no sistema.
--    A coluna senha usa VARCHAR(255) para comportar o hash (bcrypt/argon2).
--    NUNCA armazenar a senha em texto puro.
-- -----------------------------------------------------------------------------
CREATE TABLE usuario (
    id_usuario          INT           NOT NULL AUTO_INCREMENT,
    nome_usuario        VARCHAR(50)   NOT NULL,
    email               VARCHAR(100)  NOT NULL,
    senha               VARCHAR(255)  NOT NULL,
    nivel_experiencia   VARCHAR(30)   NOT NULL DEFAULT 'Iniciante',

    CONSTRAINT pk_usuario PRIMARY KEY (id_usuario),
    -- O e-mail e a credencial de login: precisa ser unico.
    CONSTRAINT uk_usuario_email UNIQUE (email),
    -- Restringe o nivel de experiencia aos valores previstos na modelagem.
    -- Os valores acompanham exatamente o <select> da tela de cadastro, que
    -- envia 'Intermediario' e 'Avancado' ACENTUADOS. Divergir aqui faria todo
    -- cadastro nesses dois niveis falhar por violacao de CHECK.
    CONSTRAINT ck_usuario_nivel_experiencia
        CHECK (nivel_experiencia IN ('Iniciante', 'Intermediário', 'Avançado'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- =============================================================================
-- NIVEL 2 - TABELAS QUE DEPENDEM DO NIVEL 1
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 3. exercicio
--    Biblioteca de exercicios com o conteudo educativo de prevencao de lesoes
--    (instrucoes tecnicas e alertas de seguranca).
-- -----------------------------------------------------------------------------
CREATE TABLE exercicio (
    id_exercicio        INT           NOT NULL AUTO_INCREMENT,
    nome                VARCHAR(100)  NOT NULL,
    url_video           VARCHAR(255)  NOT NULL,
    instrucoes_tecnicas TEXT          NOT NULL,
    alertas_seguranca   TEXT          NULL,
    id_grupo_muscular   INT           NOT NULL,

    CONSTRAINT pk_exercicio PRIMARY KEY (id_exercicio),
    CONSTRAINT fk_exercicio_grupo_muscular
        FOREIGN KEY (id_grupo_muscular)
        REFERENCES grupo_muscular (id_grupo_muscular)
        ON DELETE RESTRICT   -- impede excluir um grupo que ainda possua exercicios
        ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_exercicio_grupo_muscular ON exercicio (id_grupo_muscular);

-- -----------------------------------------------------------------------------
-- 4. treino
--    Fichas de treino montadas por cada usuario.
-- -----------------------------------------------------------------------------
CREATE TABLE treino (
    id_treino           INT           NOT NULL AUTO_INCREMENT,
    nome                VARCHAR(100)  NOT NULL,
    data_criacao        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario          INT           NOT NULL,

    CONSTRAINT pk_treino PRIMARY KEY (id_treino),
    CONSTRAINT fk_treino_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario)
        ON DELETE CASCADE    -- ao excluir o usuario, seus treinos vao junto
        ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_treino_usuario ON treino (id_usuario);

-- -----------------------------------------------------------------------------
-- 6. registro_lesao
--    Diario de dores e desconfortos relatados pelo usuario.
--    id_exercicio e NULO quando o desconforto nao foi associado a um exercicio.
-- -----------------------------------------------------------------------------
CREATE TABLE registro_lesao (
    id_registro_lesao   INT           NOT NULL AUTO_INCREMENT,
    local_lesao         VARCHAR(100)  NOT NULL,
    tipo_desconforto    VARCHAR(100)  NOT NULL,
    intensidade_dor     INT           NOT NULL,
    observacoes         TEXT          NULL,
    data_registro       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario          INT           NOT NULL,
    id_exercicio        INT           NULL,

    CONSTRAINT pk_registro_lesao PRIMARY KEY (id_registro_lesao),
    -- Escala visual analogica de dor: 1 a 10.
    CONSTRAINT ck_registro_lesao_intensidade
        CHECK (intensidade_dor BETWEEN 1 AND 10),
    CONSTRAINT fk_registro_lesao_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_registro_lesao_exercicio
        FOREIGN KEY (id_exercicio)
        REFERENCES exercicio (id_exercicio)
        ON DELETE SET NULL   -- preserva o historico da lesao mesmo sem o exercicio
        ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_registro_lesao_usuario   ON registro_lesao (id_usuario);
CREATE INDEX idx_registro_lesao_exercicio ON registro_lesao (id_exercicio);

-- -----------------------------------------------------------------------------
-- 7. registro_carga
--    Historico de cargas por exercicio. Base para detectar progressao de carga
--    abrupta, um dos principais fatores de risco de lesao.
-- -----------------------------------------------------------------------------
CREATE TABLE registro_carga (
    id_registro_carga   INT           NOT NULL AUTO_INCREMENT,
    carga_utilizada     DOUBLE        NOT NULL,
    data_registro       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario          INT           NOT NULL,
    id_exercicio        INT           NOT NULL,

    CONSTRAINT pk_registro_carga PRIMARY KEY (id_registro_carga),
    CONSTRAINT ck_registro_carga_valor CHECK (carga_utilizada >= 0),
    CONSTRAINT fk_registro_carga_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_registro_carga_exercicio
        FOREIGN KEY (id_exercicio)
        REFERENCES exercicio (id_exercicio)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_registro_carga_usuario   ON registro_carga (id_usuario);
CREATE INDEX idx_registro_carga_exercicio ON registro_carga (id_exercicio);

-- -----------------------------------------------------------------------------
-- 8. historico_evolucao
--    Consolidacao do volume de treino semanal do usuario.
-- -----------------------------------------------------------------------------
CREATE TABLE historico_evolucao (
    id_historico            INT       NOT NULL AUTO_INCREMENT,
    data_registro           DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    volume_treino_semanal   DOUBLE    NOT NULL,
    id_usuario              INT       NOT NULL,

    CONSTRAINT pk_historico_evolucao PRIMARY KEY (id_historico),
    CONSTRAINT ck_historico_evolucao_volume CHECK (volume_treino_semanal >= 0),
    CONSTRAINT fk_historico_evolucao_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_historico_evolucao_usuario ON historico_evolucao (id_usuario);

-- -----------------------------------------------------------------------------
-- 9. gasto_caloricos
--    Resultados da calculadora de gasto calorico.
--    tempo_atividade em minutos; resultado em kcal.
-- -----------------------------------------------------------------------------
CREATE TABLE gasto_caloricos (
    id_gasto_calorico   INT           NOT NULL AUTO_INCREMENT,
    tipo_exercicio      VARCHAR(100)  NOT NULL,
    tempo_atividade     DOUBLE        NOT NULL,
    intensidade         VARCHAR(30)   NOT NULL,
    resultado           DOUBLE        NOT NULL,
    id_usuario          INT           NOT NULL,
    id_exercicio        INT           NOT NULL,

    CONSTRAINT pk_gasto_caloricos PRIMARY KEY (id_gasto_calorico),
    CONSTRAINT ck_gasto_caloricos_tempo     CHECK (tempo_atividade > 0),
    CONSTRAINT ck_gasto_caloricos_resultado CHECK (resultado >= 0),
    CONSTRAINT ck_gasto_caloricos_intensidade
        CHECK (intensidade IN ('Baixa', 'Moderada', 'Alta')),
    CONSTRAINT fk_gasto_caloricos_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_gasto_caloricos_exercicio
        FOREIGN KEY (id_exercicio)
        REFERENCES exercicio (id_exercicio)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_gasto_caloricos_usuario   ON gasto_caloricos (id_usuario);
CREATE INDEX idx_gasto_caloricos_exercicio ON gasto_caloricos (id_exercicio);

-- =============================================================================
-- NIVEL 3 - TABELA ASSOCIATIVA (depende de treino e exercicio)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 5. item_treino
--    Itens (exercicios) que compoem uma ficha de treino, com series e
--    repeticoes. Resolve o relacionamento N:N entre treino e exercicio.
-- -----------------------------------------------------------------------------
CREATE TABLE item_treino (
    id_item_treino      INT           NOT NULL AUTO_INCREMENT,
    ordem_execucao      INT           NOT NULL,
    numero_series       INT           NOT NULL,
    numero_repeticoes   INT           NOT NULL,
    id_treino           INT           NOT NULL,
    id_exercicio        INT           NOT NULL,

    CONSTRAINT pk_item_treino PRIMARY KEY (id_item_treino),
    CONSTRAINT ck_item_treino_ordem      CHECK (ordem_execucao    > 0),
    CONSTRAINT ck_item_treino_series     CHECK (numero_series     > 0),
    CONSTRAINT ck_item_treino_repeticoes CHECK (numero_repeticoes > 0),
    -- Nao permite duas posicoes iguais dentro da mesma ficha de treino.
    CONSTRAINT uk_item_treino_ordem UNIQUE (id_treino, ordem_execucao),
    CONSTRAINT fk_item_treino_treino
        FOREIGN KEY (id_treino)
        REFERENCES treino (id_treino)
        ON DELETE CASCADE    -- ao excluir a ficha, os itens vao junto
        ON UPDATE CASCADE,
    CONSTRAINT fk_item_treino_exercicio
        FOREIGN KEY (id_exercicio)
        REFERENCES exercicio (id_exercicio)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_item_treino_treino    ON item_treino (id_treino);
CREATE INDEX idx_item_treino_exercicio ON item_treino (id_exercicio);

-- =============================================================================
-- CARGA INICIAL DE DADOS (dados ficticios para testes do front-end)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- grupo_muscular
-- -----------------------------------------------------------------------------
INSERT INTO grupo_muscular (nome) VALUES
    ('Peito'),        -- 1
    ('Costas'),       -- 2
    ('Pernas'),       -- 3
    ('Ombros'),       -- 4
    ('Biceps'),       -- 5
    ('Triceps'),      -- 6
    ('Abdomen');      -- 7

-- -----------------------------------------------------------------------------
-- exercicio
-- As URLs de video sao ficticias: substitua pelos links definitivos do projeto.
-- -----------------------------------------------------------------------------
INSERT INTO exercicio (nome, url_video, instrucoes_tecnicas, alertas_seguranca, id_grupo_muscular) VALUES
(
    'Supino Reto com Barra',
    'https://www.youtube.com/watch?v=exemplo01',
    'Deite no banco com os pes firmes no chao e as escapulas retraidas. Segure a barra com pegada pouco mais aberta que a largura dos ombros. Desca a barra de forma controlada ate a linha do peito, mantendo os cotovelos a cerca de 45 graus do tronco, e empurre ate a extensao dos cotovelos sem travar a articulacao.',
    'Nao abra os cotovelos a 90 graus: aumenta o estresse sobre o ombro e o risco de lesao no manguito rotador. Nunca quique a barra no peito. Utilize parceiro ou barra de seguranca em cargas altas.',
    1
),
(
    'Crucifixo com Halteres',
    'https://www.youtube.com/watch?v=exemplo02',
    'Deitado no banco, mantenha os cotovelos levemente flexionados e fixos durante todo o movimento. Abra os bracos em arco ate sentir o alongamento do peitoral e retorne pela mesma trajetoria.',
    'Evite descer os halteres abaixo da linha do banco: a hiperextensao do ombro sobrecarrega a capsula articular. Inicie sempre com cargas leves.',
    1
),
(
    'Puxada Frontal na Polia',
    'https://www.youtube.com/watch?v=exemplo03',
    'Sente-se com as coxas travadas sob o apoio e o tronco levemente inclinado para tras. Puxe a barra ate a parte superior do peito, iniciando o movimento pela depressao das escapulas, e retorne controlando a subida.',
    'Nunca puxe a barra atras da nuca: essa variacao aumenta o risco de lesao no ombro e na cervical. Evite usar impulso do tronco.',
    2
),
(
    'Remada Curvada com Barra',
    'https://www.youtube.com/watch?v=exemplo04',
    'Com os joelhos semiflexionados, incline o tronco cerca de 45 graus mantendo a coluna neutra. Puxe a barra em direcao ao abdomen aproximando as escapulas e desca de forma controlada.',
    'Manter a lombar arredondada sob carga e a principal causa de lesao neste exercicio. Ative o core e reduza a carga se nao conseguir sustentar a coluna neutra.',
    2
),
(
    'Agachamento Livre',
    'https://www.youtube.com/watch?v=exemplo05',
    'Barra apoiada no trapezio, pes na largura dos ombros com as pontas levemente para fora. Desca empurrando o quadril para tras ate que as coxas fiquem ao menos paralelas ao solo, mantendo os joelhos alinhados com a ponta dos pes. Suba empurrando o chao.',
    'Nao deixe os joelhos colapsarem para dentro (valgo dinamico) nem retire os calcanhares do chao. A perda da curvatura lombar no fundo do movimento aumenta o risco de lesao discal.',
    3
),
(
    'Leg Press 45',
    'https://www.youtube.com/watch?v=exemplo06',
    'Apoie os pes na plataforma na largura dos ombros, mantendo lombar e quadril totalmente apoiados no encosto. Desca ate aproximadamente 90 graus de flexao do joelho e empurre sem travar os joelhos no final.',
    'Nao desca alem do ponto em que o quadril comeca a sair do apoio: isso arredonda a lombar sob alta carga. Evite a extensao com travamento brusco dos joelhos.',
    3
),
(
    'Desenvolvimento com Halteres',
    'https://www.youtube.com/watch?v=exemplo07',
    'Sentado com o encosto apoiando a coluna, halteres na altura dos ombros e palmas voltadas para frente. Empurre para cima ate quase a extensao completa e retorne controlando a descida.',
    'Evite hiperestender a lombar ao empurrar. Nao realize o movimento atras da nuca. Interrompa a serie ao sentir dor na face anterior do ombro.',
    4
),
(
    'Elevacao Lateral',
    'https://www.youtube.com/watch?v=exemplo08',
    'Em pe, halteres ao lado do corpo e cotovelos levemente flexionados. Eleve os bracos lateralmente ate a altura dos ombros e desca de forma controlada.',
    'Nao ultrapasse a altura dos ombros e evite balancar o tronco para gerar impulso: ambos aumentam o risco de sindrome do impacto.',
    4
),
(
    'Rosca Direta com Barra',
    'https://www.youtube.com/watch?v=exemplo09',
    'Em pe, pegada supinada na largura dos ombros e cotovelos junto ao tronco. Flexione os cotovelos elevando a barra ate a altura do peito e desca controlando a fase excentrica.',
    'Evite balancar o tronco e projetar os cotovelos a frente. Mantenha os punhos neutros para nao sobrecarregar os tendoes.',
    5
),
(
    'Triceps na Polia Alta',
    'https://www.youtube.com/watch?v=exemplo10',
    'Em pe, de frente para a polia, cotovelos fixos e colados ao tronco. Estenda os antebracos ate a extensao completa e retorne sem deixar os cotovelos abrirem.',
    'Nao use o peso do corpo para empurrar a barra. Cargas excessivas com os cotovelos soltos sobrecarregam a articulacao.',
    6
),
(
    'Prancha Abdominal',
    'https://www.youtube.com/watch?v=exemplo11',
    'Apoie antebracos e pontas dos pes no solo mantendo cabeca, tronco e quadril alinhados. Contraia abdomen e gluteos e sustente a posicao pelo tempo determinado, respirando normalmente.',
    'Nao deixe o quadril cair, pois sobrecarrega a lombar, nem eleve demais. Interrompa o exercicio quando nao conseguir mais manter o alinhamento.',
    7
);

-- =============================================================================
-- FIM DO SCRIPT
-- =============================================================================
