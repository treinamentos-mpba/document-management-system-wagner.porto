# Especificação - Document Management System

## 1. Objetivo 

Entregar uma aplicação web que permita a usuários autenticados enviar, listar e baixar seus documentos, mantendo os arquivos no filesystem local e os metadados em memória.

## 2. Escopo

### Dentro do escopo

- Autenticação por token Bearer para usuários previamente configurados por ambiente.
- Upload de documentos, listagem dos documentos do usuário autenticado e download por identificador.
- Associação de cada documento ao usuário autenticado, sem aceitar o proprietário informado pelo cliente.
- Interface web em React para upload, listagem e download, consumindo a API pelo prefixo `/api` do proxy Vite.
- Armazenamento de arquivos em `backend/storage` com Multer `diskStorage`.
- Metadados mantidos em memória durante a execução do processo.

### Fora do escopo

- Armazenamento em nuvem, bancos de dados ou provedores externos.
- Versionamento, edição, compartilhamento ou exclusão de documentos por usuários.
- Cadastro, login, recuperação de senha ou administração de contas pela aplicação.
- Persistência ou recuperação automática de metadados após reinício.
- Restrição de formatos de arquivo ou validação de conteúdo baseada somente no MIME informado pelo cliente.
- Controle de acesso baseado em papéis ou permissões além da propriedade do documento.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | A API deve autenticar as operações de documentos por token Bearer associado a um proprietário configurado no ambiente; a interface deve permitir informar esse token sem oferecer cadastro ou login pela aplicação. |
| RF-02 | O usuário pode enviar um único arquivo por requisição usando `multipart/form-data` no campo `file`. |
| RF-03 | O upload deve rejeitar requisições sem arquivo e arquivos maiores que 10 MiB (10.485.760 bytes). |
| RF-04 | O servidor deve gerar o identificador e o nome físico do arquivo; não deve usar o nome enviado pelo usuário como caminho no filesystem. |
| RF-05 | Cada upload aceito deve criar metadados com proprietário derivado da autenticação e data/hora definida pelo servidor. |
| RF-06 | O usuário pode listar somente os documentos associados ao seu próprio identificador de proprietário. |
| RF-07 | A listagem deve apresentar primeiro os documentos mais recentes; empates devem ter ordenação determinística pelo identificador. |
| RF-08 | O usuário pode baixar um documento pelo identificador se ele existir e pertencer ao proprietário autenticado. |
| RF-09 | Um documento inexistente e um documento pertencente a outro usuário devem produzir a mesma resposta externa, sem revelar a existência de documentos de terceiros. |
| RF-10 | A interface deve apresentar estados de carregamento, sucesso, lista vazia e erro para upload, listagem e download. |
| RF-11 | No início do servidor, o conteúdo gerenciado em `backend/storage` deve ser removido. Arquivos e metadados não sobrevivem a reinícios. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Backend em Node.js e Express, em CommonJS; frontend em React e Vite, em ES Modules; JavaScript sem TypeScript nesta fase. |
| RNF-02 | Uploads gravados localmente em `backend/storage` usando Multer com `diskStorage`. Não utilizar serviços ou provedores externos de armazenamento. |
| RNF-03 | Metadados mantidos em memória; reiniciar o processo elimina os registros e a limpeza no startup elimina os arquivos do storage. |
| RNF-04 | Configurações operacionais e credenciais devem vir de variáveis de ambiente, sem segredos no repositório, logs ou URLs. |
| RNF-05 | O limite de upload deve ser aplicado no middleware de upload, antes de aceitar o arquivo para processamento. |
| RNF-06 | O nome físico do arquivo deve ser gerado pelo servidor e não deve conter segmentos de caminho fornecidos pelo cliente. |
| RNF-07 | Como qualquer tipo de arquivo é aceito, downloads devem ser enviados como anexo binário (`application/octet-stream`) e com `X-Content-Type-Options: nosniff`. |
| RNF-08 | Erros devem ser tratados nos limites HTTP e de filesystem; detalhes internos, caminhos locais e tokens não devem ser incluídos nas respostas. |
| RNF-09 | Testes de backend devem usar o runner nativo `node:test`. |
| RNF-10 | O código deve manter responsabilidades pequenas e fluxo de dependência `routes -> controllers -> services -> repositories`. |
| RNF-11 | O token informado pela interface deve permanecer somente em memória durante a sessão da página; não persistir em `localStorage`, URL ou logs. |

## 5. Identidade e configuração

A aplicação não mantém cadastro de usuários. O ambiente fornece a associação entre tokens Bearer e identificadores de proprietário usando `DMS_USERS_JSON`, uma lista JSON de objetos com os campos `owner` e `token`:

```json
[
  { "owner": "usuario-1", "token": "<token-secreto>" },
  { "owner": "usuario-2", "token": "<outro-token-secreto>" }
]
```

O exemplo é apenas ilustrativo; tokens reais devem ser fornecidos pelo ambiente de execução, ser únicos e não ser registrados em logs. A aplicação deve falhar ao iniciar se a variável estiver ausente, malformada, vazia ou tiver owners/tokens duplicados. Tokens devem ser comparados sem expor seu valor em mensagens de erro. `PORT` configura a porta HTTP; seu padrão é `3000`.

O cliente envia o token no cabeçalho `Authorization: Bearer <token>`. O owner associado ao token validado é a única fonte do campo `owner`; qualquer campo de owner enviado pelo cliente deve ser ignorado ou rejeitado. Token ausente ou inválido resulta em `401 Unauthorized`.

Como não há endpoint de login, a interface solicita o token configurado ao usuário, mantém o valor apenas no estado em memória da página e o envia no cabeçalho `Authorization` em cada chamada protegida. Ao recarregar ou fechar a página, o usuário informa o token novamente.

## 6. Modelo de dados

### Metadados públicos do documento

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | string | Identificador único, gerado pelo servidor. |
| `originalName` | string | Nome original fornecido no upload, mantido apenas como metadado. |
| `size` | number | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Data/hora UTC de recebimento, serializada em ISO 8601. |
| `owner` | string | Identificador do proprietário derivado do token autenticado. |

Exemplo de representação pública:

```json
{
  "id": "<document-id>",
  "originalName": "relatorio.pdf",
  "size": 24576,
  "uploadedAt": "2026-10-28T14:30:00.000Z",
  "owner": "usuario-1"
}
```

### Metadados internos

O repositório pode manter campos que não são retornados ao cliente:

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `storedName` | string | Nome físico gerado pelo servidor, sem caminho recebido do cliente. |
| `mimeType` | string | MIME informado pelo cliente, tratado como não confiável e não usado para autorizar ou validar conteúdo. |

Os registros são mantidos em memória e indexados por `id`. A resposta pública nunca deve expor `storedName`, caminhos absolutos ou detalhes internos do filesystem. O caminho para leitura é composto exclusivamente a partir do diretório local fixo e do nome físico gerado pelo servidor.

## 7. Contratos de API

Os caminhos nesta seção são os caminhos do backend. No frontend, as chamadas usam `/api` como prefixo; o proxy de desenvolvimento Vite remove esse prefixo antes de encaminhar ao backend.

### Formato comum de erro

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Descrição segura e compreensível do erro."
  }
}
```

O campo `code` é estável para tratamento pelo frontend. Mensagens destinadas ao usuário devem estar em português. Respostas de erro não incluem stack trace, caminhos, tokens ou detalhes de infraestrutura.

### `POST /upload`

- Autenticação: obrigatória; `Authorization: Bearer <token>`.
- Entrada: `multipart/form-data`, exatamente um arquivo no campo `file`.
- Ordem: validar o token antes de executar Multer, para que requisições não autenticadas não gravem arquivos no storage.
- Limite: 10 MiB (10.485.760 bytes). Qualquer tipo é aceito; o MIME do cliente não comprova o conteúdo.
- Processamento: Multer com `diskStorage` grava no diretório local usando nome físico gerado pelo servidor. O `owner` vem da identidade autenticada.
- Sucesso: `201 Created`, corpo JSON:

```json
{
  "document": {
    "id": "<document-id>",
    "originalName": "relatorio.pdf",
    "size": 24576,
    "uploadedAt": "2026-10-28T14:30:00.000Z",
    "owner": "usuario-1"
  }
}
```

| Status | Condição |
| --- | --- |
| `201` | Arquivo gravado e metadados registrados. |
| `400` | Arquivo ausente, multipart inválido ou mais de um arquivo enviado. |
| `401` | Token ausente ou inválido. |
| `413` | Arquivo excede 10 MiB. |
| `500` | Falha inesperada ao gravar arquivo ou registrar metadados. |

Se uma falha ocorrer após a gravação e antes do registro dos metadados, o arquivo parcialmente processado deve ser removido para evitar órfãos. Erros de validação não devem deixar arquivos no storage.

### `GET /documents`

- Autenticação: obrigatória; `Authorization: Bearer <token>`.
- Entrada: sem corpo ou parâmetros obrigatórios.
- Sucesso: `200 OK`, lista do owner autenticado, ordenada por `uploadedAt` decrescente e, em caso de empate, por `id`:

```json
{
  "documents": [
    {
      "id": "<document-id>",
      "originalName": "relatorio.pdf",
      "size": 24576,
      "uploadedAt": "2026-10-28T14:30:00.000Z",
      "owner": "usuario-1"
    }
  ]
}
```

Uma conta sem documentos recebe `200 OK` com `"documents": []`. A listagem nunca inclui registros de outros owners.

| Status | Condição |
| --- | --- |
| `200` | Listagem retornada, inclusive quando vazia. |
| `401` | Token ausente ou inválido. |

### `GET /documents/:id/download`

- Autenticação: obrigatória; `Authorization: Bearer <token>`.
- Entrada: identificador do documento no parâmetro `id`.
- Autorização: o registro deve existir e pertencer ao owner autenticado.
- Sucesso: `200 OK`, conteúdo binário como anexo, `Content-Type: application/octet-stream`, `Content-Disposition: attachment` com o nome original codificado com segurança e `X-Content-Type-Options: nosniff`.
- Não retornar o caminho local nem confiar no nome original para construir caminhos no filesystem.

| Status | Condição |
| --- | --- |
| `200` | Arquivo transmitido com sucesso. |
| `401` | Token ausente ou inválido. |
| `404` | Documento inexistente, de outro owner ou arquivo local ausente. |
| `500` | Erro inesperado de leitura ou transmissão antes do início da resposta. |

Uma falha de transmissão depois que a resposta binária começou deve encerrar a conexão; não tentar substituir a resposta por JSON. Documento de outro owner e documento inexistente devem ser indistinguíveis para o cliente.

## 8. Decisões arquiteturais

- **Backend:** Node.js + Express, CommonJS, JavaScript.
- **Frontend:** React + Vite, componentes funcionais com Hooks e `fetch` para a API por `/api`.
- **Rotas:** definem os caminhos HTTP, compõem a autenticação e o middleware Multer, e delegam aos controllers.
- **Controllers:** adaptam requisição/resposta HTTP, encaminham dados validados e convertem resultados/erros para o contrato da API.
- **Services:** aplicam as regras de negócio, incluindo associação do owner, limite/fluxo do upload e autorização de acesso aos documentos.
- **Repositories:** mantêm e consultam metadados em memória e encapsulam o acesso aos arquivos locais necessários para download e limpeza.
- **Multer:** configurado com `diskStorage` para gravação local em `backend/storage`; o nome físico é gerado pelo servidor. Tipos externos como Express e Multer não devem vazar para regras de negócio.
- **Composição:** a aplicação configura dependências e o ciclo de vida do storage na inicialização; se a configuração ou limpeza falhar, o servidor não deve iniciar parcialmente.
- **Testes:** runner nativo `node:test`; testar contratos HTTP e regras de isolamento por owner sem depender de serviços externos.

## 9. Plano de execução futuro

Estas etapas descrevem a implementação posterior. Não fazem parte da entrega deste documento e não devem ser executadas durante a etapa de especificação.

1. Preparar configuração de ambiente, validação de tokens e associação segura entre identidade autenticada e owner.
2. Construir o fluxo de backend para upload, metadados em memória, listagem filtrada, download local, tratamento de erros e limpeza no startup, respeitando as camadas arquiteturais.
3. Construir a interface React para enviar arquivos, apresentar a lista do usuário autenticado, baixar documentos e comunicar estados vazios e erros.
4. Integrar frontend e backend via proxy `/api`; validar autenticação, limite de upload, isolamento entre owners, ciclo de vida após reinício e erros de filesystem.

## 10. Critérios de aceite

- Todos os requisitos RF e RNF desta especificação estão cobertos por testes ou validação manual documentada durante a implementação futura.
- Requests sem credenciais válidas não conseguem operar sobre documentos.
- Um owner não consegue listar nem baixar documentos de outro owner.
- Uploads válidos dentro do limite são armazenados localmente e retornam metadados públicos sem informações internas.
- Upload sem arquivo, multipart inválido e arquivo acima do limite retornam os status definidos e não deixam arquivos órfãos.
- Download transmite o conteúdo como anexo e protege o nome de arquivo contra uso como caminho.
- A listagem é estável e ordenada; vazia retorna sucesso com lista vazia.
- Ao reiniciar, o diretório local gerenciado é limpo e nenhum documento anterior aparece na listagem.
- A implementação mantém a direção de dependências definida e não introduz armazenamento externo.