-- =============================================================================
-- MIGRACAO OPCIONAL — colunas que a tela da Biblioteca usa e o modelo atual
-- ainda nao guarda.
-- -----------------------------------------------------------------------------
-- POR QUE ISTO EXISTE
--
-- A tela da Biblioteca exibe, para cada exercicio:
--     nivel de dificuldade, equipamento, musculos secundarios e dicas.
--
-- A tabela `exercicio` do modelo entregue tem apenas:
--     nome, url_video, instrucoes_tecnicas, alertas_seguranca, id_grupo_muscular
--
-- Sem estas colunas, a API devolve valores padrao para esses campos e a tela
-- perde as etiquetas de nivel, o filtro por dificuldade e a aba de dicas.
--
-- ESTE ARQUIVO E OPCIONAL. Rode apenas se voce quiser que a Biblioteca seja
-- alimentada integralmente pelo banco. Se rodar, lembre de atualizar tambem
-- o Dicionario de Dados (Tabela 17) na documentacao do TG.
--
-- COMO RODAR:
--     mysql -u root -p db_treino_seguro < migracao_opcional.sql
-- =============================================================================

USE db_treino_seguro;

-- -----------------------------------------------------------------------------
-- 1. Novas colunas em `exercicio`
-- -----------------------------------------------------------------------------
ALTER TABLE exercicio
    ADD COLUMN nivel_dificuldade VARCHAR(20) NOT NULL DEFAULT 'Iniciante'
        COMMENT 'Iniciante, Intermediário ou Avançado'
        AFTER alertas_seguranca,

    ADD COLUMN equipamento VARCHAR(100) NULL
        COMMENT 'Barra, halteres, polia alta, peso do corpo...'
        AFTER nivel_dificuldade,

    ADD COLUMN dicas TEXT NULL
        COMMENT 'Uma dica por linha, mesma convencao de instrucoes_tecnicas'
        AFTER equipamento,

    ADD COLUMN url_youtube VARCHAR(255) NULL
        COMMENT 'ID ou URL do video no YouTube, exigido pelo RF 05'
        AFTER dicas;

-- Mantem o nivel restrito aos mesmos tres valores usados em `usuario`
ALTER TABLE exercicio
    ADD CONSTRAINT ck_exercicio_nivel
        CHECK (nivel_dificuldade IN ('Iniciante', 'Intermediário', 'Avançado'));

-- -----------------------------------------------------------------------------
-- 2. Musculos secundarios
--    Um exercicio ativa varios musculos secundarios, e o mesmo musculo aparece
--    como secundario em varios exercicios: e um relacionamento N:N. Guardar
--    numa coluna de texto separada por virgula funcionaria, mas quebraria a
--    Primeira Forma Normal e impediria consultas do tipo "todos os exercicios
--    que ativam o triceps". Por isso, tabela associativa.
-- -----------------------------------------------------------------------------
CREATE TABLE exercicio_musculo_secundario (
    id_exercicio      INT         NOT NULL,
    id_grupo_muscular INT         NOT NULL,

    CONSTRAINT pk_exercicio_musculo
        PRIMARY KEY (id_exercicio, id_grupo_muscular),

    CONSTRAINT fk_ems_exercicio
        FOREIGN KEY (id_exercicio)
        REFERENCES exercicio (id_exercicio)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_ems_grupo
        FOREIGN KEY (id_grupo_muscular)
        REFERENCES grupo_muscular (id_grupo_muscular)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_ems_grupo ON exercicio_musculo_secundario (id_grupo_muscular);

-- -----------------------------------------------------------------------------
-- 3. Exemplo de preenchimento dos novos campos
-- -----------------------------------------------------------------------------
UPDATE exercicio
   SET nivel_dificuldade = 'Iniciante',
       equipamento       = 'Barra e banco reto',
       dicas             = CONCAT_WS('\n',
           'Esprema o peitoral no topo do movimento para maior ativação.',
           'Controle a descida em ~3 segundos para maximizar o trabalho excêntrico.',
           'Varie a largura de pegada para recrutar diferentes partes do peitoral.'
       )
 WHERE nome = 'Supino Reto com Barra';

UPDATE exercicio
   SET nivel_dificuldade = 'Avançado',
       equipamento       = 'Barra'
 WHERE nome = 'Levantamento Terra';

UPDATE exercicio
   SET nivel_dificuldade = 'Intermediário',
       equipamento       = 'Barra'
 WHERE nome = 'Remada Curvada com Barra';

-- Musculos secundarios do supino: triceps e ombros
INSERT INTO exercicio_musculo_secundario (id_exercicio, id_grupo_muscular)
SELECT e.id_exercicio, g.id_grupo_muscular
  FROM exercicio e
  JOIN grupo_muscular g ON g.nome IN ('Tríceps', 'Ombros')
 WHERE e.nome = 'Supino Reto com Barra';

-- =============================================================================
-- 4. Depois de rodar esta migracao, ajuste a consulta em rotas/exercicios.js
--    para trazer os novos campos:
--
--    SELECT ...,
--           e.nivel_dificuldade,
--           e.equipamento,
--           e.dicas,
--           e.url_youtube
--
--    E em formatarExercicio(), troque os valores padrao por:
--
--       dificuldade: (linha.nivel_dificuldade || 'Iniciante')
--                      .toLowerCase()
--                      .normalize('NFD').replace(/[̀-ͯ]/g, ''),
--       equipamento: linha.equipamento || '',
--       dicas:       textoParaLista(linha.dicas),
--       youtubeId:   linha.url_youtube || ''
-- =============================================================================
