# Replication TUI Generator

Uma aplicação de Terminal User Interface (TUI) para geração de prompts profissionais com assistência de IA, construída com [OpenTUI](https://github.com/nicklucas/opentui) e React.

![Bun](https://img.shields.io/badge/Bun-1.0+-black?logo=bun)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue?logo=typescript)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)

## Visão Geral

O Replication TUI Generator é uma ferramenta de linha de comando interativa que ajuda a criar prompts otimizados utilizando técnicas avançadas de prompt engineering. Ele usa a API do OpenRouter para gerar prompts profissionais e estruturados.

## Funcionalidades

- **Gerar Novo Prompt** - Crie prompts personalizados com assistência de IA
- **Ver Prompts Existentes** - Visualize e gerencie prompts salvos
- **Gerar Contexto** - Analise projetos e gere contexto para seus prompts
- **Gerar Padrão de Projeto** - Documente padrões de projeto automaticamente
- **Indexar Arquivos** - Indexação vetorial e busca semântica de código
- **Configurações** - Configure API key, modelo e diretório de saída

## Técnicas de Prompt Engineering Suportadas

| Técnica | Descrição |
|---------|-----------|
| **Role Prompting** | Define uma persona especialista para o modelo |
| **Generated Knowledge** | Gera conhecimento de base antes de responder |
| **Few-Shot** | Inclui exemplos de entrada e saída esperada |
| **Chain-of-Thought (CoT)** | Instrui o modelo a raciocinar passo a passo |
| **Tree of Thoughts (ToT)** | Explora múltiplos caminhos e avalia opções |
| **Self-Consistency** | Gera variações e consolida na melhor |
| **ReAct** | Ciclo de Raciocinar → Agir → Observar |
| **Maieutic Prompting** | Valida e justifica as próprias afirmações |

## Formatos de Saída

- **XML** - Ideal para prompts estruturados e processáveis por IA
- **Markdown** - Excelente para legibilidade humana e documentação
- **Texto Simples** - Bom para interações diretas

## Requisitos

- [Bun](https://bun.sh/) 1.0 ou superior
- Chave de API do [OpenRouter](https://openrouter.ai/)
- Para usar a feature de **Indexação Vetorial**: 
  - Chave de API do OpenRouter (para embeddings)
  - Modelo recomendado: `openai/text-embedding-3-small`

## Instalação

```bash
# Clone o repositório
git clone <url-do-repositorio>
cd replication

# Instale as dependências
bun install

# Instale globalmente
bun link
```

Após instalar, o comando `replication` estará disponível globalmente!

## Uso

### Uso Global (Recomendado)

```bash
# Entre na pasta do seu projeto
cd /caminho/para/seu/projeto

# Windows (recomendado - sempre usa versão mais recente)
replication.cmd

# Linux/Mac ou Windows (pode usar cache)
replication
```

**💡 Dica Windows:** Use `replication.cmd` para evitar problemas de cache do Bun.

O TUI será executado no contexto da pasta atual!

### Uso Local

```bash
# No diretório do projeto replication
bun start

# Modo de desenvolvimento (com hot reload)
bun dev
```

**📖 Veja instruções detalhadas em [INSTALL.md](./INSTALL.md)**

## Configuração

Na primeira execução, configure sua chave de API do OpenRouter através do menu **Configurações**. As configurações são salvas em:

```
~/.replication/config.json
```

### Opções de Configuração

| Opção | Descrição | Padrão |
|-------|-----------|--------|
| `apiKey` | Chave de API do OpenRouter | - |
| `outputDir` | Diretório para salvar prompts | `~/replication-prompts` |
| `model` | Modelo de IA a ser usado | `google/gemini-2.5-flash` |

### Indexação Vetorial

A feature de **Indexar Arquivos** permite criar um índice vetorial de sua codebase para busca semântica:

1. **Configure a API Key**: No menu Configurações ou em `~/.replication/config.json`
2. **Escolha a velocidade**: Lento, Balanceado, Rápido, Turbo ou Personalizado
3. **Indexar**: Selecione "Indexar Arquivos" e escolha um diretório
4. **Buscar**: Após indexar, use a busca semântica para encontrar código relevante

**Características:**
- ✅ **Processamento em batch** - Múltiplos chunks por requisição
- ✅ **Concorrência configurável** - De 1 a infinito workers simultâneos
- ✅ **Chunks de 512 caracteres** - Com overlap de 50 para contexto
- ✅ **Embeddings via OpenRouter** - Modelo `qwen/qwen3-embedding-8b`
- ✅ **Busca por similaridade de cosseno** - Top 5 resultados
- ✅ **Banco SQLite nativo** - Via `bun:sqlite` (sem DLL dependencies)
- ✅ **Ignora arquivos ocultos** - Qualquer arquivo/pasta iniciando com `.` é ignorado
- ✅ **Logs dedicados** - Em `.replication/logs/embedding/`

**Presets de Performance:**
- 🐌 **Lento**: 1 concorrência, 1 batch - Mais seguro para APIs com limite
- ⚖️ **Balanceado**: 3 concorrência, 10 batch - Recomendado
- ⚡ **Rápido**: 5 concorrência, 20 batch - Para APIs robustas
- 🚀 **Turbo**: 10 concorrência, 50 batch - Máxima velocidade
- ⚙️ **Personalizado**: Digite seus próprios valores

**Extensões suportadas:**
- Código: `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.java`, `.go`, `.rs`, `.c`, `.cpp`, `.cs`, `.php`, `.rb`, etc.
- Documentação: `.md`, `.txt`, `.json`, `.yaml`, `.yml`, `.xml`, `.toml`

## Estrutura do Projeto

```
replication/
├── config/                 # Arquivos de configuração
│   ├── formats.json       # Formatos de saída disponíveis
│   ├── menus.json         # Configuração dos menus
│   ├── techniques.json    # Técnicas de prompt engineering
│   └── templates/         # Templates de prompts
├── src/
│   ├── components/        # Componentes React reutilizáveis
│   ├── screens/           # Telas da aplicação
│   ├── services/          # Serviços (API, arquivos, etc.)
│   ├── types/             # Definições de tipos TypeScript
│   ├── utils/             # Utilitários e helpers
│   ├── App.tsx            # Componente principal
│   └── index.tsx          # Entry point
└── package.json
```

## Tecnologias

- **[OpenTUI](https://github.com/nicklucas/opentui)** - Framework para TUIs
- **React 19** - Biblioteca de UI
- **TypeScript** - Tipagem estática
- **Bun** - Runtime JavaScript rápido
- **Zod** - Validação de schemas
- **OpenRouter API** - Acesso a múltiplos modelos de IA
- **bun:sqlite** - Banco de dados SQLite nativo para indexação vetorial
- **cosine-similarity** - Cálculo de similaridade para busca semântica
- **p-queue** - Controle de concorrência para processamento eficiente
- **axios** - Cliente HTTP para chamadas à API

## Navegação

| Tecla | Ação |
|-------|------|
| `↑` `↓` | Navegar entre opções |
| `Enter` | Selecionar opção |
| `Esc` | Voltar ao menu anterior |
| `Ctrl+C` | Sair da aplicação |

## Licença

MIT
