import { randomUUID } from 'node:crypto';
import { MDocument, type BaseChunkOptions } from '@mastra/rag'
import { defaultsDeep } from 'lodash-es';
import { parse as parseCSV } from "csv-parse";
import { htmlToText } from 'html-to-text'
import { extractText, getMeta, getDocumentProxy } from 'unpdf'
import { extractRawText } from 'mammoth'
import type { FileUpload } from '@/lib/schema'
import type { DocumentInterface } from './types'

interface FileLoaderTypeDef<Options extends Record<string, any> = {}, Metadata extends Record<string, any> = {}> {
  options: Options
  metadata: Metadata
}

interface FileLoaderTypeMap {
  pdf: FileLoaderTypeDef<{}, {
    pageNumber: number
    file: {
      title?: string
      author?: string
      totalPages?: number
      language?: string
    }
  }>
  docx: FileLoaderTypeDef
  txt: FileLoaderTypeDef
  md: FileLoaderTypeDef
  csv: FileLoaderTypeDef
  html: FileLoaderTypeDef
}

export type FileLoaderType = Extract<keyof FileLoaderTypeMap, string>

type FileLoaderDocMap = {
  [Type in FileLoaderType]: DocumentInterface<FileLoaderTypeMap[Type]['metadata'] & FileLoaderMetadata & {
    file: {
      id: string
      name: string
      type: Type
    }
  }>
}

export type FileLoaderDoc<Type extends FileLoaderType = FileLoaderType> = FileLoaderDocMap[Type]

export type FileLoaderInput<Type extends FileLoaderType = FileLoaderType> = FileUpload<Type>

export type FileLoaderResult<Type extends FileLoaderType = FileLoaderType> = {
  docs: FileLoaderDoc<Type>[]
  tokens: number
}

export type FileLoaderMetadata = {
  userId: string
  chatId?: string
  projectId?: string
}

export type FileLoaderOptions = {
  chunks?: BaseChunkOptions
}

export class FileLoader {
  private readonly metadata: FileLoaderMetadata;
  private readonly options: FileLoaderOptions & typeof FileLoader.defaultOptions;
  private static readonly defaultOptions = {
    chunks: {
      maxSize: 1000,
      overlap: 200,
    },
  } satisfies FileLoaderOptions

  constructor(metadata: FileLoaderMetadata, options?: FileLoaderOptions) {
    this.metadata = metadata;
    this.options = defaultsDeep({}, options, FileLoader.defaultOptions);
  }

  async load(file: FileLoaderInput): Promise<FileLoaderResult> {
    const typeUpper = file.type.toUpperCase() as Uppercase<typeof file.type>
    const loadMethod = `load${typeUpper}` as const
    if(!(loadMethod in this)) {
      throw new Error(`Unsupported file type: ${file.type}`)
    }
    return await this[loadMethod](file as any)
  }

  isDocType<K extends FileLoaderType>(doc: FileLoaderDoc, type: K): doc is FileLoaderDoc<K> {
    return doc.metadata.file.type === type
  }

  private async loadPDF(file: FileLoaderInput<'pdf'>): Promise<FileLoaderResult<'pdf'>> {
    const proxy = await getDocumentProxy(new Uint8Array(await file.blob.arrayBuffer()))
    const { info } = await getMeta(proxy);
    const { text, totalPages } = await extractText(proxy);
    const doc = new MDocument({
      docs: text.map((pageText, index) => ({
        text: pageText.trim(),
        metadata: {
          pageNumber: index + 1,
        },
      })),
      type: 'text'
    })
    const chunks = await doc.chunk({
      strategy: 'recursive',
      ...this.options.chunks,
    })
    return this.transformDocuments(file, chunks, (metadata) => ({
      pageNumber: metadata.pageNumber,
      file: {
        totalPages,
        title: info.Title || undefined,
        author: info.Author || undefined,
        language: info.Language || undefined,
      }
    }));
  }

  private async loadDOCX(file: FileLoaderInput<'docx'>): Promise<FileLoaderResult<'docx'>> {
    const docx = await extractRawText({ buffer: Buffer.from(await file.blob.arrayBuffer()) });
    const doc = MDocument.fromText(docx.value)
    const chunks = await doc.chunk({
      strategy: 'recursive',
      ...this.options.chunks,
    })
    return this.transformDocuments(file, chunks)
  }

  private async loadTXT(file: FileLoaderInput<'txt'>): Promise<FileLoaderResult<'txt'>> {
    const text = await file.blob.text()
    const doc = MDocument.fromText(text)
    const chunks = await doc.chunk({
      strategy: 'recursive',
      ...this.options.chunks,
    })
    return this.transformDocuments(file, chunks)
  }

  private async loadMD(file: FileLoaderInput<'md'>): Promise<FileLoaderResult<'md'>> {
    const text = await file.blob.text()
    const doc = MDocument.fromMarkdown(text)
    const chunks = await doc.chunk({
      strategy: 'semantic-markdown',
      joinThreshold: Math.round(this.options.chunks.maxSize / 4),
      ...this.options.chunks,
    })
    return this.transformDocuments(file, chunks)
  }

  private async loadCSV(file: FileLoaderInput<'csv'>): Promise<FileLoaderResult<'csv'>> {
    const text = await file.blob.text()
    const parser = parseCSV(text, {
      bom: true,
      trim: true,
      columns: true,
      skipEmptyLines: true,
      skipRecordsWithEmptyValues: true,
      skipRecordsWithError: true,
    })
    let i = 0
    let markdown = '';
    for await (const record of parser) {
      i++;
      const content: string[] = [`## Record ${i}`]
      Object.keys(record).forEach((key) => {
        content.push(`- ${key}: ${record[key]}`)
      })
      markdown += content.join('\n') + '\n'
    }
    const doc = MDocument.fromMarkdown(markdown)
    const chunks = await doc.chunk({
      strategy: 'semantic-markdown',
      joinThreshold: Math.round(this.options.chunks.maxSize / 4),
      ...this.options.chunks,
    })
    return this.transformDocuments(file, chunks)
  }

  private async loadHTML(file: FileLoaderInput<'html'>): Promise<FileLoaderResult<'html'>> {
    const html = await file.blob.text()
    const text = htmlToText(html, { baseElements: { selectors: ['html'] } })
    const doc = MDocument.fromText(text)
    const chunks = await doc.chunk({
      strategy: 'recursive',
      ...this.options.chunks,
    })
    return this.transformDocuments(file, chunks)
  }

  private transformDocuments<T extends FileLoaderType>(file: FileLoaderInput<T>, chunks: { text: string, metadata: Record<string, any> }[], metaFn: (metadata: Record<string, any>, index: number) => FileLoaderTypeMap[T]['metadata'] = () => ({})) {
    let charCount = 0;
    const docs = chunks.map(({ text, metadata }, index) => {
      charCount += text.length;
      const docMeta = metaFn(metadata, index)
      return {
        id: randomUUID(),
        data: text,
        metadata: {
          ...docMeta,
          ...this.metadata,
          file: {
            ...('file' in docMeta ? docMeta.file as {} : {}),
            id: file.id,
            name: file.name,
            type: file.type,
          },
        },
      }
    })
    return { docs, tokens: Math.round(charCount / 4) }
  }
}
