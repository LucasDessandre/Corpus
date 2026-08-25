-- Corrige o CHECK de nivel_experiencia num banco JA CRIADO.
-- Alinha os valores aceitos ao que o <select> do cadastro realmente envia.
-- Rode apenas se o banco ja existe; num banco novo, o db_treino_seguro.sql
-- ja sai com os valores corretos.

USE db_treino_seguro;

ALTER TABLE usuario DROP CONSTRAINT ck_usuario_nivel_experiencia;

ALTER TABLE usuario
    ADD CONSTRAINT ck_usuario_nivel_experiencia
    CHECK (nivel_experiencia IN ('Iniciante', 'Intermediário', 'Avançado'));

-- Converte registros gravados antes da correcao
UPDATE usuario SET nivel_experiencia = 'Intermediário' WHERE nivel_experiencia = 'Intermediario';
UPDATE usuario SET nivel_experiencia = 'Avançado'      WHERE nivel_experiencia = 'Avancado';
