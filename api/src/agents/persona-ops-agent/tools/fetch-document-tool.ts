import { z } from 'zod';
import { FunctionTool } from '@google/adk';
import type { SourceDocumentService } from '../../../application/source-document/source-document-service.js';

export function createFetchDocumentTool(
  projectId: string,
  sourceDocumentService: SourceDocumentService,
) {
  return new FunctionTool({
    name: 'fetch_document',
    description:
      'Fetches the content of a given URL, extracts the plain text, and saves it as a reference document for the project. Use this tool when the user provides a URL to read.',
    parameters: z.object({
      url: z.url().describe('The URL to fetch the content from.'),
    }),
    execute: async (input: { url: string }) => {
      try {
        const document = await sourceDocumentService.addSourceDocument({
          projectId,
          type: 'url',
          reference: input.url,
        });

        if (document.fetchStatus === 'error') {
          return `Failed to fetch the document from ${input.url}. Error: ${document.errorMessage}`;
        }

        return `Successfully fetched sourceDocumentId=${document.id} from ${input.url}.\n\nContent:\n${document.contentSnapshot}`;
      } catch (error) {
        if (error instanceof Error) {
          return `Failed to fetch the document from ${input.url}: ${error.message}`;
        }
        return `Failed to fetch the document from ${input.url} due to an unknown error.`;
      }
    },
  });
}
