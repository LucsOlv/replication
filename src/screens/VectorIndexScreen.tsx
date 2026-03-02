import { useState, useEffect } from 'react';
import { useKeyboard } from '@opentui/react';
import { ScreenContainer } from '../components/ScreenContainer';
import { InfoBox, ErrorBox } from '../components/StatusBox';
import { MinimalSelect } from '../components/CustomSelect';
import { VectorIndexService } from '../services/VectorIndexService';
import { useVectorIndexStore } from '../store/useVectorIndexStore';
import { PERFORMANCE_PRESETS } from '../types/vectorIndex';

interface Props {
  onBack: () => void;
}

type View = 'menu' | 'config' | 'custom-config' | 'select-directory' | 'indexing' | 'search-directory' | 'search' | 'results';

export function VectorIndexScreen({ onBack }: Props) {
  const [view, setView] = useState<View>('menu');
  const [directoryInput, setDirectoryInput] = useState('./');
  const [indexedDirectory, setIndexedDirectory] = useState('./');
  const [searchInput, setSearchInput] = useState('');
  const [searchDirectory, setSearchDirectory] = useState('./');
  const [selectedPreset, setSelectedPreset] = useState<string>('balanced');
  const [customConcurrency, setCustomConcurrency] = useState('3');
  const [customBatchSize, setCustomBatchSize] = useState('10');
  const [customInputField, setCustomInputField] = useState<'concurrency' | 'batchSize'>('concurrency');
  
  const {
    isIndexing,
    indexProgress,
    indexError,
    searchResults,
    searchError,
    lastIndexedAt,
    totalFiles,
    totalChunks,
    indexingConfig,
    setIsIndexing,
    setIndexProgress,
    setIndexError,
    setSearchResults,
    setSearchError,
    setMetadata,
    setIndexingConfig,
  } = useVectorIndexStore();

  // Carrega metadata ao montar o componente
  useEffect(() => {
    const metadataResult = VectorIndexService.getIndexMetadata(indexedDirectory);
    if (metadataResult.ok) {
      setMetadata(metadataResult.value);
    }
  }, [setMetadata, indexedDirectory]);

  useKeyboard((key) => {
    if (key.name === 'escape') {
      if (view === 'menu') {
        onBack();
      } else if (view === 'custom-config') {
        if (customInputField === 'batchSize') {
          // Back to concurrency input
          setCustomInputField('concurrency');
        } else {
          // Back to config menu
          setView('config');
        }
      } else if (view === 'search') {
        setView('search-directory');
        setSearchError(null);
      } else if (!isIndexing) {
        setView('menu');
        setIndexError(null);
        setSearchError(null);
      }
    }
  });

  const handleMenuSelect = (item: any) => {
    if (item.value === 'back') {
      onBack();
      return;
    }

    if (item.value === 'index') {
      setView('config'); // Vai para config antes de select-directory
    } else if (item.value === 'search') {
      setSearchDirectory(indexedDirectory || './');
      setView('search-directory');
    } else if (item.value === 'clear') {
      handleClearIndex();
    }
  };

  const handleConfigSelect = (item: any) => {
    const presetKey = item.value as keyof typeof PERFORMANCE_PRESETS;
    if (presetKey in PERFORMANCE_PRESETS) {
      setSelectedPreset(presetKey);
      setIndexingConfig(PERFORMANCE_PRESETS[presetKey]);
      setDirectoryInput('./');
      setIndexError(null);
      setView('select-directory');
    } else if (item.value === 'custom') {
      setSelectedPreset('custom');
      setCustomInputField('concurrency');
      setView('custom-config');
    } else if (item.value === 'back') {
      setView('menu');
    }
  };

  const handleCustomConfigSubmit = () => {
    if (customInputField === 'concurrency') {
      // Move to batch size input
      setCustomInputField('batchSize');
    } else {
      // Both fields filled, apply config
      const concurrency = parseInt(customConcurrency, 10);
      const batchSize = parseInt(customBatchSize, 10);

      // Validate only that they are positive numbers
      if (isNaN(concurrency) || concurrency < 1) {
        setIndexError('Concorrência deve ser um número maior que 0');
        return;
      }
      if (isNaN(batchSize) || batchSize < 1) {
        setIndexError('Batch size deve ser um número maior que 0');
        return;
      }

      setIndexingConfig({
        concurrency,
        batchSize,
        chunkSize: 512,
        chunkOverlap: 50,
      });
      setDirectoryInput('./');
      setIndexError(null);
      setView('select-directory');
    }
  };

  const handleStartIndexing = async () => {
    if (!directoryInput.trim()) {
      setIndexError('Por favor, digite um diretório válido');
      return;
    }

    setView('indexing');
    setIsIndexing(true);
    setIndexError(null);
    setIndexProgress(null);
    setIndexedDirectory(directoryInput);

    const result = await VectorIndexService.indexDirectory(
      directoryInput,
      (progress) => {
        setIndexProgress(progress);
      },
      indexingConfig // Passa a config
    );

    setIsIndexing(false);

    if (result.ok) {
      const summary = result.value;
      
      // Atualiza metadata
      const metadataResult = VectorIndexService.getIndexMetadata(directoryInput);
      if (metadataResult.ok) {
        setMetadata(metadataResult.value);
      }

      // Mostra resumo
      if (summary.errors.length > 0) {
        setIndexError(
          `Indexação concluída com ${summary.errors.length} erro(s). ` +
          `${summary.processedFiles}/${summary.totalFiles} arquivos, ` +
          `${summary.totalChunks} chunks em ${(summary.duration / 1000).toFixed(1)}s`
        );
      } else {
        setIndexProgress({
          currentFile: 'Concluído!',
          processedFiles: summary.processedFiles,
          totalFiles: summary.totalFiles,
          processedChunks: summary.totalChunks,
          errors: 0,
        });
      }
    } else {
      setIndexError(result.error.message);
    }
  };

  const handleSearch = async () => {
    if (!searchInput.trim()) {
      setSearchError('Digite uma query para buscar');
      return;
    }

    setSearchError(null);
    setSearchResults([]);

    const result = await VectorIndexService.search(searchInput, searchDirectory, 5);

    if (result.ok) {
      setSearchResults(result.value);
      setView('results');
    } else {
      setSearchError(result.error.message);
    }
  };

  const handleClearIndex = async () => {
    const result = VectorIndexService.clearIndex(indexedDirectory);
    if (result.ok) {
      setMetadata({
        lastIndexedAt: null,
        totalFiles: 0,
        totalChunks: 0,
      });
      // Volta ao menu após limpar
      setView('menu');
    } else {
      setIndexError(result.error.message);
    }
  };

  // VIEW: Menu principal
  if (view === 'menu') {
    const menuItems = [
      {
        name: 'Indexar Arquivos',
        description: 'Indexar diretório com embeddings vetoriais',
        value: 'index',
      },
      {
        name: 'Buscar',
        description: totalChunks > 0 
          ? `Buscar semanticamente (${totalChunks} chunks indexados)` 
          : 'Nenhum índice criado ainda',
        value: 'search',
        disabled: totalChunks === 0,
      },
      {
        name: 'Limpar Índice',
        description: 'Apagar todos os dados indexados',
        value: 'clear',
        disabled: totalChunks === 0,
      },
      {
        name: 'Voltar',
        description: 'Retornar ao menu principal',
        value: 'back',
      },
    ];

    return (
      <ScreenContainer title="Indexação Vetorial">
        <box flexDirection="column" gap={1}>
          {lastIndexedAt && (
            <box flexDirection="column" marginBottom={1}>
              <text>
                <span style={{ fg: 'gray' }}>
                  Última indexação: {lastIndexedAt.toLocaleString()}
                </span>
              </text>
              <text>
                <span style={{ fg: 'gray' }}>
                  {totalFiles} arquivos, {totalChunks} chunks
                </span>
              </text>
            </box>
          )}
          <MinimalSelect 
            options={menuItems} 
            onSelect={handleMenuSelect}
          />
        </box>
      </ScreenContainer>
    );
  }

  // VIEW: Configuração de performance
  if (view === 'config') {
    const configItems = [
      {
        name: '🐌 Lento (Seguro)',
        description: 'Concorrência: 1 | Batch: 1 chunk por vez',
        value: 'slow',
      },
      {
        name: '⚖️  Balanceado (Recomendado)',
        description: 'Concorrência: 3 | Batch: 10 chunks por vez',
        value: 'balanced',
      },
      {
        name: '⚡ Rápido',
        description: 'Concorrência: 5 | Batch: 20 chunks por vez',
        value: 'fast',
      },
      {
        name: '🚀 Turbo (Máximo)',
        description: 'Concorrência: 10 | Batch: 50 chunks por vez',
        value: 'turbo',
      },
      {
        name: '⚙️  Personalizado',
        description: 'Digite seus próprios valores',
        value: 'custom',
      },
      {
        name: 'Voltar',
        description: 'Retornar ao menu anterior',
        value: 'back',
      },
    ];

    return (
      <ScreenContainer title="Configuração de Performance">
        <box flexDirection="column" gap={1}>
          <text>
            <span style={{ fg: 'cyan' }}>Selecione a velocidade de indexação:</span>
          </text>
          <box marginBottom={1}>
            <text>
              <span style={{ fg: 'gray' }}>
                • Concorrência: Quantos embeddings processar simultaneamente
              </span>
            </text>
          </box>
          <box marginBottom={1}>
            <text>
              <span style={{ fg: 'gray' }}>
                • Batch: Quantos chunks enviar por requisição à API
              </span>
            </text>
          </box>
          <InfoBox message="⚠️  Velocidades maiores = mais rápido, mas mais uso de API" />
          <MinimalSelect 
            options={configItems} 
            onSelect={handleConfigSelect}
          />
        </box>
      </ScreenContainer>
    );
  }

  // VIEW: Configuração personalizada
  if (view === 'custom-config') {
    return (
      <ScreenContainer title="Configuração Personalizada">
        <box flexDirection="column" gap={1}>
          {customInputField === 'concurrency' ? (
            <>
              <text>
                <span style={{ fg: 'cyan' }}>Digite o número de concorrência:</span>
              </text>
              <box marginBottom={1}>
                <text>
                  <span style={{ fg: 'gray' }}>
                    Quantos embeddings processar simultaneamente
                  </span>
                </text>
              </box>
              <box style={{ height: 1 }}>
                <input
                  value={customConcurrency}
                  onChange={setCustomConcurrency}
                  onSubmit={handleCustomConfigSubmit}
                  focused
                />
              </box>
              <text>
                <span style={{ fg: 'gray' }}>Recomendado: 3-10 | Atual: {customConcurrency}</span>
              </text>
              <text>
                <span style={{ fg: 'yellow' }}>⚠️  Valores altos podem sobrecarregar CPU/API</span>
              </text>
            </>
          ) : (
            <>
              <text>
                <span style={{ fg: 'green' }}>✓ Concorrência: {customConcurrency}</span>
              </text>
              <text>
                <span style={{ fg: 'cyan' }}>Digite o tamanho do batch:</span>
              </text>
              <box marginBottom={1}>
                <text>
                  <span style={{ fg: 'gray' }}>
                    Quantos chunks enviar por requisição à API
                  </span>
                </text>
              </box>
              <box style={{ height: 1 }}>
                <input
                  value={customBatchSize}
                  onChange={setCustomBatchSize}
                  onSubmit={handleCustomConfigSubmit}
                  focused
                />
              </box>
              <text>
                <span style={{ fg: 'gray' }}>Recomendado: 10-50 | Atual: {customBatchSize}</span>
              </text>
              <text>
                <span style={{ fg: 'yellow' }}>⚠️  Valores altos podem causar rate limiting</span>
              </text>
            </>
          )}
          {indexError && <ErrorBox message={indexError} />}
          <InfoBox message="Enter para confirmar | Esc para voltar" />
        </box>
      </ScreenContainer>
    );
  }

  // VIEW: Selecionar diretório para indexar
  if (view === 'select-directory') {
    const presetNames: Record<string, string> = {
      slow: '🐌 Lento',
      balanced: '⚖️  Balanceado',
      fast: '⚡ Rápido',
      turbo: '🚀 Turbo',
      custom: '⚙️  Personalizado',
    };

    return (
      <ScreenContainer title="Indexar Arquivos">
        <box flexDirection="column" gap={1}>
          <box marginBottom={1}>
            <text>
              <span style={{ fg: 'green' }}>Configuração: {presetNames[selectedPreset]}</span>
              <span style={{ fg: 'gray' }}> | Concorrência: {indexingConfig.concurrency} | Batch: {indexingConfig.batchSize}</span>
            </text>
          </box>
          <text>
            <span style={{ fg: 'cyan' }}>Digite o caminho do diretório a indexar:</span>
          </text>
          <box style={{ height: 1 }}>
            <input
              value={directoryInput}
              onChange={setDirectoryInput}
              onSubmit={handleStartIndexing}
              focused
            />
          </box>
          <text>
            <span style={{ fg: 'gray' }}>./ = diretório atual | Ex: /caminho/completo/projeto</span>
          </text>
          {indexError && <ErrorBox message={indexError} />}
          <InfoBox message="Enter para confirmar | Esc para voltar" />
        </box>
      </ScreenContainer>
    );
  }

  // VIEW: Indexando
  if (view === 'indexing') {
    const presetNames: Record<string, string> = {
      slow: '🐌 Lento',
      balanced: '⚖️  Balanceado',
      fast: '⚡ Rápido',
      turbo: '🚀 Turbo',
      custom: '⚙️  Personalizado',
    };

    return (
      <ScreenContainer title="Indexando Arquivos">
        <box flexDirection="column" gap={1}>
          <box marginBottom={1}>
            <text>
              <span style={{ fg: 'green' }}>Modo: {presetNames[selectedPreset]}</span>
              <span style={{ fg: 'gray' }}> | Concorrência: {indexingConfig.concurrency} | Batch: {indexingConfig.batchSize}</span>
            </text>
          </box>
          {indexProgress && (
            <>
              <text>
                <span style={{ fg: 'yellow' }}>
                  Arquivo: {indexProgress.currentFile}
                </span>
              </text>
              <text>
                <span style={{ fg: 'cyan' }}>
                  Progresso: {indexProgress.processedFiles}/{indexProgress.totalFiles} arquivos
                </span>
              </text>
              <text>
                <span style={{ fg: 'cyan' }}>
                  Chunks processados: {indexProgress.processedChunks}
                </span>
              </text>
              {indexProgress.errors > 0 && (
                <text>
                  <span style={{ fg: 'red' }}>
                    Erros: {indexProgress.errors}
                  </span>
                </text>
              )}
              
              {/* Barra de progresso simples */}
              <box marginTop={1}>
                <text>
                  <span style={{ fg: 'green' }}>
                    {'█'.repeat(Math.floor((indexProgress.processedFiles / indexProgress.totalFiles) * 30))}
                  </span>
                  <span style={{ fg: 'gray' }}>
                    {'░'.repeat(30 - Math.floor((indexProgress.processedFiles / indexProgress.totalFiles) * 30))}
                  </span>
                  <span style={{ fg: 'white' }}>
                    {' '}{Math.round((indexProgress.processedFiles / indexProgress.totalFiles) * 100)}%
                  </span>
                </text>
              </box>
            </>
          )}
          
          {!isIndexing && !indexError && (
            <>
              <text>
                <span style={{ fg: 'green' }}>Indexação concluída!</span>
              </text>
              <InfoBox message="Pressione Esc para voltar ao menu" />
            </>
          )}
          
          {indexError && (
            <>
              <ErrorBox message={indexError} />
              <InfoBox message="Pressione Esc para voltar ao menu" />
            </>
          )}
          
          {isIndexing && (
            <text>
              <span style={{ fg: 'gray' }}>Processando em lote... Aguarde.</span>
            </text>
          )}
        </box>
      </ScreenContainer>
    );
  }

  // VIEW: Selecionar diretório para busca
  if (view === 'search-directory') {
    return (
      <ScreenContainer title="Busca Semântica - Diretório">
        <box flexDirection="column" gap={1}>
          <text>
            <span style={{ fg: 'cyan' }}>Diretório do índice para buscar:</span>
          </text>
          <box style={{ height: 1 }}>
            <input
              value={searchDirectory}
              onChange={setSearchDirectory}
              onSubmit={() => setView('search')}
              focused
            />
          </box>
          <text>
            <span style={{ fg: 'gray' }}>
              Este deve ser o diretório que foi indexado anteriormente.
            </span>
          </text>
          <text>
            <span style={{ fg: 'gray' }}>
              ./ = diretório atual | Ex: /caminho/completo/projeto
            </span>
          </text>
          <InfoBox message="Enter para confirmar | Esc para voltar" />
        </box>
      </ScreenContainer>
    );
  }

  // VIEW: Buscar
  if (view === 'search') {
    return (
      <ScreenContainer title="Busca Semântica">
        <box flexDirection="column" gap={1}>
          <text>
            <span style={{ fg: 'green' }}>Buscando em: </span>
            <span style={{ fg: 'white' }}>{searchDirectory}</span>
          </text>
          <text>
            <span style={{ fg: 'cyan' }}>Digite sua query de busca:</span>
          </text>
          <box style={{ height: 1 }}>
            <input
              value={searchInput}
              onChange={setSearchInput}
              onSubmit={handleSearch}
              focused
            />
          </box>
          <text>
            <span style={{ fg: 'gray' }}>Ex: função que processa dados JSON</span>
          </text>
          {searchError && <ErrorBox message={searchError} />}
          <InfoBox message="Enter para buscar | Esc para voltar" />
        </box>
      </ScreenContainer>
    );
  }

  // VIEW: Resultados da busca
  if (view === 'results') {
    return (
      <ScreenContainer title="Resultados da Busca">
        <box flexDirection="column" gap={1} height="100%">
          <text>
            <span style={{ fg: 'gray' }}>Query: </span>
            <span style={{ fg: 'cyan' }}>{searchInput}</span>
          </text>
          
          {searchResults.length === 0 ? (
            <text>
              <span style={{ fg: 'yellow' }}>Nenhum resultado encontrado.</span>
            </text>
          ) : (
            <scrollbox
              focused
              style={{
                scrollbarOptions: {
                  showArrows: true,
                  trackOptions: {
                    foregroundColor: '#58a6ff',
                    backgroundColor: '#2d333b',
                  },
                },
              }}
              flexGrow={1}
              padding={1}
            >
              {searchResults.map((result, i) => (
                <box key={i} flexDirection="column" marginBottom={1}>
                  <text>
                    <span style={{ fg: 'green' }}>
                      [{i + 1}] {result.filePath}
                    </span>
                    <span style={{ fg: 'gray' }}>
                      {' '}(score: {result.similarity.toFixed(3)})
                    </span>
                  </text>
                  <text>
                    <span style={{ fg: 'gray' }}>
                      {result.chunkText.slice(0, 150).replace(/\n/g, ' ')}
                      {result.chunkText.length > 150 ? '...' : ''}
                    </span>
                  </text>
                </box>
              ))}
            </scrollbox>
          )}
          
          <InfoBox message="Esc para voltar | ↑↓ para navegar" />
        </box>
      </ScreenContainer>
    );
  }

  return null;
}
