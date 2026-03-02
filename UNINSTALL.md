# Como Desinstalar o Replication TUI

Se você quiser remover o comando `replication` do seu sistema:

## Passo 1: Remover o link global

```bash
cd D:\dump_\replication
bun unlink
```

## Passo 2: Verificar remoção

```bash
where replication
# Deve retornar: comando não encontrado
```

## Passo 3: (Opcional) Remover arquivos do projeto

Se quiser remover completamente o projeto:

```bash
# Windows
rd /s /q D:\dump_\replication

# Linux/Mac
rm -rf D:\dump_\replication
```

## Passo 4: (Opcional) Limpar dados da aplicação

Os dados da aplicação ficam em `~/.replication/`:

```bash
# Windows
rd /s /q C:\Users\%USERNAME%\.replication

# Linux/Mac
rm -rf ~/.replication
```

## Reinstalar

Se quiser reinstalar depois:

```bash
cd D:\dump_\replication
bun install
bun link
```
