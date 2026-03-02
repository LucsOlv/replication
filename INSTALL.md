# Replication TUI - Instalação Global

## ✅ Instalado com sucesso!

O comando `replication` agora está disponível globalmente no seu sistema.

## 🚀 Como usar

### Execute de qualquer pasta:

```bash
# Entre na pasta do seu projeto
cd /caminho/para/seu/projeto

# Execute o Replication TUI (recomendado no Windows)
replication.cmd

# Ou use a versão JavaScript
replication
```

**⚠️ IMPORTANTE:** No Windows, use `replication.cmd` para garantir que sempre executa a versão mais recente do código sem cache.

O TUI será executado e trabalhará com os arquivos da pasta atual!

## 📋 Comandos disponíveis

- `replication` - Inicia o TUI na pasta atual
- `bun run start` - (no diretório do projeto) Inicia em modo normal
- `bun run dev` - (no diretório do projeto) Inicia em modo watch/desenvolvimento

## 🔧 Gerenciamento

### Recriar o link (se necessário)
```bash
cd D:\dump_\replication
bun link
```

### Remover o link global
```bash
cd D:\dump_\replication
bun unlink
```

## 📁 Onde está instalado

O executável está em: `C:\Users\lkluc\.bun\bin\replication.exe`

Certifique-se de que `C:\Users\lkluc\.bun\bin` está no seu PATH.

## 💡 Exemplo de uso

```bash
# Indexar projeto React
cd C:\meus-projetos\react-app
replication
# Selecione: Indexar Arquivos → Configure velocidade → Indexe!

# Indexar outro projeto Python
cd C:\meus-projetos\python-api
replication
# O índice é independente por projeto (.replication/ em cada pasta)
```

## 🎯 Funcionalidades

- ✅ Gerar prompts de IA
- ✅ Ver prompts existentes
- ✅ Ver logs do sistema
- ✅ Gerar contexto de projeto
- ✅ Gerar padrão de projeto
- ✅ **Indexação vetorial com busca semântica**
  - Velocidades: Lento, Balanceado, Rápido, Turbo, Personalizado
  - Ignora pastas que começam com `.` automaticamente
  - Logs em `.replication/logs/embedding/`
