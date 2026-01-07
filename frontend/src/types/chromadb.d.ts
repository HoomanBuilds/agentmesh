declare module "chromadb" {
  export interface CollectionMetadata {
    [key: string]: any;
  }

  export interface QueryResult {
    ids: string[][];
    embeddings: number[][] | null;
    documents: (string | null)[][];
    metadatas: (Record<string, any> | null)[][];
    distances: (number | null)[][];
  }

  export interface GetResult {
    ids: string[];
    embeddings: number[][] | null;
    documents: (string | null)[];
    metadatas: (Record<string, any> | null)[];
  }

  export interface Collection {
    name: string;
    metadata: CollectionMetadata;

    add(params: {
      ids: string[];
      embeddings?: number[][];
      metadatas?: Record<string, any>[];
      documents?: string[];
    }): Promise<void>;

    query(params: {
      queryEmbeddings?: number[][];
      queryTexts?: string[];
      nResults?: number;
      where?: Record<string, any>;
      whereDocument?: Record<string, any>;
    }): Promise<QueryResult>;

    get(params?: {
      ids?: string[];
      where?: Record<string, any>;
      whereDocument?: Record<string, any>;
      limit?: number;
      offset?: number;
    }): Promise<GetResult>;

    delete(params?: {
      ids?: string[];
      where?: Record<string, any>;
      whereDocument?: Record<string, any>;
    }): Promise<void>;

    update(params: {
      ids: string[];
      embeddings?: number[][];
      metadatas?: Record<string, any>[];
      documents?: string[];
    }): Promise<void>;

    upsert(params: {
      ids: string[];
      embeddings?: number[][];
      metadatas?: Record<string, any>[];
      documents?: string[];
    }): Promise<void>;

    count(): Promise<number>;
  }

  export class ChromaClient {
    constructor(config?: { path?: string; auth?: any });

    heartbeat(): Promise<number>;

    getCollection(params: {
      name: string;
      embeddingFunction?: any;
    }): Promise<Collection>;

    createCollection(params: {
      name: string;
      metadata?: CollectionMetadata;
      embeddingFunction?: any;
    }): Promise<Collection>;

    getOrCreateCollection(params: {
      name: string;
      metadata?: CollectionMetadata;
      embeddingFunction?: any;
    }): Promise<Collection>;

    deleteCollection(params: { name: string }): Promise<void>;

    listCollections(): Promise<Collection[]>;
  }
}
