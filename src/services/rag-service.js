import FlexSearch from 'flexsearch';
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
} from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFParse } from 'pdf-parse';

export class RagService {
  constructor(docsDir) {
    this.docsDir =
      docsDir || fileURLToPath(new URL('../../docs', import.meta.url));
    this.index = this.createIndex();
    this.documents = [];
    this.chunkId = 0;
    this.initializePromise = this.initialize();
  }

  createIndex() {
    return new FlexSearch.Document({
      document: {
        id: 'id',
        index: ['content'],
        store: ['content', 'source'],
      },
      preset: 'match',
      tokenize: 'forward',
      resolution: 9,
      encoder: 'Normalize',
    });
  }

  async initialize() {
    console.log('[rag] Initializing RAG index from', this.docsDir);
    try {
      const files = readdirSync(this.docsDir);

      for (const file of files) {
        const filePath = join(this.docsDir, file);

        if (statSync(filePath).isFile()) {
          const ext = extname(filePath).toLowerCase();
          let content = '';

          if (ext === '.md' || ext === '.txt') {
            content = readFileSync(filePath, 'utf-8');
          } else if (ext === '.pdf') {
            content = await this.parsePdf(filePath);
          }

          if (content) {
            const chunks = this.splitText(content);
            for (const chunk of chunks) {
              this.index.add({
                id: this.chunkId,
                content: chunk,
                source: file,
              });
              this.chunkId++;
            }
          }
        }
      }
      console.log(`[rag] Indexed ${this.chunkId} text chunks.`);
    } catch (error) {
      console.error('[rag] Failed to initialize index:', error.message);
    }
  }

  async rebuildIndex() {
    await this.initializePromise;
    this.index = this.createIndex();
    this.chunkId = 0;
    this.initializePromise = this.initialize();
    await this.initializePromise;
  }

  async deleteDocument(filename) {
    const filePath = join(this.docsDir, filename);
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      throw new Error('File not found.');
    }
    unlinkSync(filePath);
    await this.rebuildIndex();
  }

  async parsePdf(filePath) {
    const dataBuffer = readFileSync(filePath);
    const parser = new PDFParse({ data: dataBuffer });
    const result = await parser.getText();
    return result.text || '';
  }

  extractKeywords(query) {
    const stopwords = new Set([
      'why',
      'what',
      'who',
      'when',
      'where',
      'how',
      'is',
      'are',
      'was',
      'were',
      'the',
      'a',
      'an',
      'of',
      'for',
      'in',
      'on',
      'at',
      'to',
      'from',
      'that',
      'this',
      'these',
      'those',
      'and',
      'or',
      'but',
      'with',
      'by',
      'about',
      'as',
      'it',
      'its',
      'your',
      'you',
      'their',
      'my',
      'me',
      'i',
      'we',
      'us',
      'do',
      'does',
      'did',
      'will',
      'can',
      'could',
      'should',
      'would',
      'be',
      'been',
      'being',
    ]);

    return query
      .toLowerCase()
      .replace(/[\p{P}\p{S}]+/gu, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopwords.has(word));
  }

  searchIndex(query, limit = 3) {
    const results = this.index.search(query, limit, { enrich: true });
    if (!results || results.length === 0) return [];

    const fieldResults = results.find((r) => r.field === 'content');
    if (!fieldResults) return [];

    return fieldResults.result.map((res) => ({
      content: res.doc.content,
      source: res.doc.source,
    }));
  }

  addDocument(filename, textContent) {
    const chunks = this.splitText(textContent);
    for (const chunk of chunks) {
      this.index.add({
        id: this.chunkId,
        content: chunk,
        source: filename,
      });
      this.chunkId++;
    }
    console.log(
      `[rag] Indexed ${chunks.length} chunks from new document: ${filename}`
    );
  }

  // Simple text splitter by paragraphs
  splitText(text, chunkSize = 500, overlap = 100) {
    const paragraphs = text.split(/\n\s*\n/);
    const chunks = [];
    let currentChunk = '';

    for (const p of paragraphs) {
      if (
        currentChunk.length + p.length > chunkSize &&
        currentChunk.length > 0
      ) {
        chunks.push(currentChunk.trim());
        // Keep a bit of overlap
        currentChunk = currentChunk.slice(-overlap) + ' ' + p;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + p;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  async search(query, limit = 3) {
    await this.initializePromise;
    let results = this.searchIndex(query, limit);

    if (results.length === 0) {
      const keywords = this.extractKeywords(query);
      const seen = new Map();

      for (const keyword of keywords) {
        const partial = this.searchIndex(keyword, limit);
        for (const result of partial) {
          const key = `${result.source}||${result.content.slice(0, 100)}`;
          if (!seen.has(key)) {
            seen.set(key, result);
          }
          if (seen.size >= limit) break;
        }
        if (seen.size >= limit) break;
      }

      results = [...seen.values()].slice(0, limit);
    }

    return results;
  }
}
