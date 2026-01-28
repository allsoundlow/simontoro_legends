// MemoryConnection type defined inline to avoid circular dependency
export type MemoryConnection = {
  type: "memory";
};

export function createMemoryConnection(): MemoryConnection {
  return {type: "memory"};
}
