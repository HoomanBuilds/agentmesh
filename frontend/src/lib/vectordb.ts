import { ChromaClient } from "chromadb";
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";

type Collection = any;

/**
 * ChromaDB client singleton
 * Server-side only (API routes, Server Actions)
 */
let chromaClient: ChromaClient | null = null;

export function getChromaClient(): ChromaClient {
  if (!chromaClient) {
    const chromaUrl = process.env.CHROMA_URL;
    const chromaApiKey = process.env.CHROMA_API_KEY;
    const chromaTenant = process.env.CHROMA_TENANT;
    const chromaDatabase = process.env.CHROMA_DATABASE;

    if (chromaApiKey && chromaTenant && chromaDatabase) {
      const { CloudClient } = require("chromadb");
      chromaClient = new CloudClient({
        apiKey: chromaApiKey,
        tenant: chromaTenant,
        database: chromaDatabase,
      });
    }
    else if (chromaUrl) {
      chromaClient = new ChromaClient({
        path: chromaUrl,
      });
    } else {
      throw new Error(
        "ChromaDB configuration missing. Set CHROMA_URL or CHROMA_API_KEY + CHROMA_TENANT + CHROMA_DATABASE"
      );
    }
  }
  
  if (!chromaClient) {
    throw new Error("Failed to initialize ChromaDB client");
  }
  
  return chromaClient;
}

/**
 * Get or create collection for agent chat memories
 */
export async function getAgentMemoryCollection(): Promise<Collection> {
  const client = getChromaClient();

  try {
    const { registerEmbeddingFunction } = require("chromadb");

    class DummyEmbeddingFunction {
      public name: string = "dummy_embedding_function";

      public async generate(texts: string[]): Promise<number[][]> {
        return texts.map(() => []);
      }

      public getConfig() {
        return { type: "known", name: this.name };
      }

      public static buildFromConfig() {
        return new DummyEmbeddingFunction();
      }
    }

    try {
      registerEmbeddingFunction("dummy_embedding_function", DummyEmbeddingFunction);
    } catch (e) {
      // Already registered
    }

    return await client.getOrCreateCollection({
      name: "agent_memories",
      metadata: { description: "Chat memories for AI agents" },
      embeddingFunction: new DummyEmbeddingFunction(),
    });
  } catch (error) {
    console.error("Error getting collection:", error);
    throw error;
  }
}

/**
 * Generate embedding using OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: text,
    });
    return embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

/**
 * Store a chat message in vector DB
 */
export async function storeMessage(
  agentId: number,
  userAddress: string,
  role: "user" | "assistant",
  content: string,
  sessionId: string = "default",
  timestamp: number = Date.now()
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const collection = await getAgentMemoryCollection();
    const embedding = await generateEmbedding(content);

    const id = `${agentId}_${userAddress}_${timestamp}_${role}`;

    await collection.add({
      ids: [id],
      embeddings: [embedding],
      metadatas: [{
        agentId: agentId.toString(),
        userAddress,
        role,
        timestamp: timestamp.toString(),
        sessionId,
      }],
      documents: [content],
    });

    return { success: true, id };
  } catch (error: any) {
    console.error("Error storing message:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Search for relevant memories using semantic search
 */
export async function searchMemories(
  agentId: number,
  userAddress: string,
  query: string,
  limit: number = 5,
  sessionId?: string
): Promise<Array<{ content: string; role: string; timestamp: number; distance: number }>> {
  try {
    const collection = await getAgentMemoryCollection();
    const queryEmbedding = await generateEmbedding(query);

    const whereClause: any = {
      $and: [{ agentId: agentId.toString() }, { userAddress }],
    };

    if (sessionId) {
      whereClause.$and.push({ sessionId });
    }

    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: limit,
      where: whereClause,
    });

    if (!results.documents?.[0] || !results.metadatas?.[0] || !results.distances?.[0]) {
      return [];
    }

    return results.documents[0].map((doc: any, idx: number) => ({
      content: doc || "",
      role: (results.metadatas?.[0]?.[idx]?.role as string) || "",
      timestamp: parseInt((results.metadatas?.[0]?.[idx]?.timestamp as string) || "0"),
      distance: results.distances?.[0]?.[idx] || 0,
    }));
  } catch (error) {
    console.error("Error searching memories:", error);
    return [];
  }
}

/**
 * Get recent messages (chronological)
 */
export async function getRecentMessages(
  agentId: number,
  userAddress: string,
  limit: number = 10,
  sessionId?: string
): Promise<Array<{ content: string; role: string; timestamp: number }>> {
  try {
    const collection = await getAgentMemoryCollection();

    const whereClause: any = {
      $and: [{ agentId: agentId.toString() }, { userAddress }],
    };

    if (sessionId) {
      whereClause.$and.push({ sessionId });
    }

    const results = await collection.get({
      where: whereClause,
    });

    if (!results.documents || !results.metadatas) {
      return [];
    }

    const messages = results.documents
      .map((doc: any, idx: number) => ({
        content: doc || "",
        role: (results.metadatas?.[idx]?.role as string) || "",
        timestamp: parseInt((results.metadatas?.[idx]?.timestamp as string) || "0"),
      }))
      .sort((a: any, b: any) => b.timestamp - a.timestamp)
      .slice(0, limit)
      .reverse();

    return messages;
  } catch (error) {
    console.error("Error getting recent messages:", error);
    return [];
  }
}

/**
 * Knowledge base collection
 */
export async function getKnowledgeBaseCollection(): Promise<Collection> {
  const client = getChromaClient();

  try {
    const { registerEmbeddingFunction } = require("chromadb");

    class DummyEmbeddingFunction {
      public name: string = "dummy_embedding_function";

      public async generate(texts: string[]): Promise<number[][]> {
        return texts.map(() => []);
      }

      public getConfig() {
        return { type: "known", name: this.name };
      }

      public static buildFromConfig() {
        return new DummyEmbeddingFunction();
      }
    }

    try {
      registerEmbeddingFunction("dummy_embedding_function", DummyEmbeddingFunction);
    } catch (e) {}

    return await client.getOrCreateCollection({
      name: "agent_knowledge_base",
      metadata: { description: "Knowledge base documents for AI agents" },
      embeddingFunction: new DummyEmbeddingFunction(),
    });
  } catch (error) {
    console.error("Error getting knowledge base collection:", error);
    throw error;
  }
}

/**
 * Add documents to knowledge base
 */
export async function addToKnowledgeBase(
  agentId: number,
  documents: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const collection = await getKnowledgeBaseCollection();

    const embeddings = await Promise.all(
      documents.map((doc) => generateEmbedding(doc))
    );

    const ids = documents.map((_, idx) => `${agentId}_${Date.now()}_${idx}`);
    const metadatas = documents.map(() => ({
      agentId: agentId.toString(),
      timestamp: Date.now().toString(),
    }));

    await collection.add({
      ids,
      embeddings,
      metadatas,
      documents,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error adding to knowledge base:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Search knowledge base
 */
export async function searchKnowledgeBase(
  agentId: number,
  query: string,
  limit: number = 3
): Promise<string[]> {
  try {
    const collection = await getKnowledgeBaseCollection();
    const queryEmbedding = await generateEmbedding(query);

    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: limit,
      where: { agentId: agentId.toString() },
    });

    if (!results.documents?.[0]) {
      return [];
    }

    return results.documents[0].filter((doc: any): doc is string => doc !== null);
  } catch (error) {
    console.error("Error searching knowledge base:", error);
    return [];
  }
}
