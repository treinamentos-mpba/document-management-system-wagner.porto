---
description: "Implementa um requisito específico do DMS com base na especificação e nas convenções do projeto."
name: implementar-requisito-dms
argument-hint: "ID do requisito ou descrição objetiva (ex. RF-06)"
agent: agent
---

# Implementar requisito do DMS

Implemente somente este requisito: `${input:requisito:ID do requisito ou descrição objetiva}`.

Antes de editar:

1. Leia `docs/specs/dms-spec.md` e `.github/copilot-instructions.md`.
2. Examine a implementação, os testes e os pontos de integração diretamente relacionados ao requisito.
3. Identifique quais camadas realmente precisam mudar e mantenha o escopo limitado a elas.
4. Se o requisito estiver ausente da especificação ou houver conflito entre fontes, pare e peça esclarecimento antes de assumir um comportamento.

Ao implementar:

- Preserve as convenções da stack e a arquitetura existente. No backend, mantenha o fluxo `routes -> controllers -> services -> repositories` e não faça camadas internas dependerem de Express ou Multer.
- No frontend, use componentes funcionais, Hooks e o serviço `fetch` existente; evite duplicar comportamento.
- Respeite as regras da especificação para autenticação, propriedade dos documentos, contratos HTTP, limite de upload e armazenamento estritamente local com Multer `diskStorage`.
- Não adicione armazenamento externo, dependências ou abstrações sem necessidade.
- Trate erros no limite apropriado e não exponha tokens, caminhos locais ou detalhes internos.
- Adicione ou ajuste testes focados para o comportamento alterado, seguindo os padrões existentes.
- Não altere arquivos sem relação com o requisito e não faça commit ou push.

Valide a mudança com o teste ou build mais específico disponível para a camada afetada. Ao concluir, resuma o comportamento implementado, os arquivos alterados e os comandos de validação executados.