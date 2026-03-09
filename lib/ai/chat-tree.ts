import type { ChatMessage } from '@/lib/ai'

export class ChatTree {
  private readonly nodeById = new Map<string, ChatMessage>()
  private readonly nodesByParentId = new Map<string | null, string[]>()
  private readonly latestLeafByNodeId = new Map<string, string>()
  private readonly latestNodeIdByRole: Record<ChatMessage['role'], string | null> = {
    user: null,
    assistant: null,
    system: null,
  }
  private latestNodeId: string | null = null

  constructor(initialNodes: ChatMessage[] = []) {
    for (const node of initialNodes) {
      this.addNode(node)
    }
  }

  /**
   * Build the latest full root-to-end conversation path.
   */
  buildLatestPath() {
    if (this.latestNodeId == null) {
      return []
    }

    return this.buildPathFromLeafNode(this.latestNodeId)
  }

  buildPathFromLeafNode(nodeId: string): ChatMessage[] {
    const node = this.getNodeById(nodeId)
    const pathToRoot: ChatMessage[] = [node]

    let { parentId } = node.metadata
    while (parentId != null) {
      const parent = this.getNodeById(parentId)
      pathToRoot.push(parent)
      parentId = parent.metadata.parentId
    }

    pathToRoot.reverse()
    return pathToRoot
  }

  getNodeVariants(nodeId: string): string[] {
    const { metadata } = this.getNodeById(nodeId)
    return this.nodesByParentId.get(metadata.parentId) ?? []
  }

  getLatestNodeId(role?: ChatMessage['role']) {
    if (role != null) {
      return this.latestNodeIdByRole[role]
    }
    return this.latestNodeId
  }

  addNode(node: ChatMessage) {
    if (this.nodeById.has(node.id)) {
      throw new Error(`Duplicate message ID: ${node.id}`)
    }

    const prevNode = this.latestNodeId ? this.getNodeById(this.latestNodeId) : null
    if (prevNode && this.compareNodesByDate(prevNode, node) >= 0) {
      throw new Error(`Message ID must be increasing. prev=${prevNode.id} next=${node.id}`)
    }

    const { parentId } = node.metadata
    if (parentId !== null && !this.nodeById.has(parentId)) {
      throw new Error(`Parent message not found for ${node.id}: ${parentId}`)
    }

    const siblingIds = this.nodesByParentId.get(parentId) ?? []
    const firstSiblingId = siblingIds[0]
    if (firstSiblingId) {
      const firstSibling = this.getNodeById(firstSiblingId)
      if (firstSibling.role !== node.role) {
        throw new Error(`Invalid tree: mixed child roles under parent ${parentId}`)
      }
    }

    siblingIds.push(node.id)
    this.nodesByParentId.set(parentId, siblingIds)
    this.nodeById.set(node.id, node)
    this.latestNodeId = node.id
    this.latestNodeIdByRole[node.role] = node.id

    // Collect node and ancestor ids for leaf cache invalidation
    if (this.latestLeafByNodeId.size > 0) {
      let currentNode = node as ChatMessage | null
      while (currentNode != null) {
        this.latestLeafByNodeId.delete(currentNode.id)
        const { parentId } = currentNode.metadata
        currentNode = parentId ? this.getNodeById(parentId) : null
      }
    }
  }

  updateNode(next: ChatMessage) {
    const node = this.getNodeById(next.id)
    if (node.role !== next.role) {
      throw new Error(`Message role is immutable for id ${next.id}`)
    }
    if (node.metadata.parentId !== next.metadata.parentId) {
      throw new Error(`Message parentId is immutable for id ${next.id}`)
    }

    this.nodeById.set(next.id, next)
  }

  getNodeById(nodeId: string, strict: false): ChatMessage | undefined
  getNodeById(nodeId: string, strict?: true): ChatMessage
  getNodeById(nodeId: string, strict = true): ChatMessage | undefined {
    const node = this.nodeById.get(nodeId)
    if (!node) {
      if (!strict) return undefined
      throw new Error(`Invalid message id: ${nodeId}`)
    }
    return node
  }

  getAllNodes(): ChatMessage[] {
    return [...this.nodeById.values()]
  }

  findLatestLeafDescendant(nodeId: string): string {
    this.getNodeById(nodeId)
    return this.resolveLatestLeafDescendant(nodeId, new Set())
  }

  private resolveLatestLeafDescendant(nodeId: string, visiting: Set<string>): string {
    const cached = this.latestLeafByNodeId.get(nodeId)
    if (cached) {
      return cached
    }
    if (visiting.has(nodeId)) {
      throw new Error(`Cycle detected while traversing message tree at ${nodeId}`)
    }
    visiting.add(nodeId)

    const childIds = this.nodesByParentId.get(nodeId) ?? []
    let latestLeafId = nodeId

    if (childIds.length > 0) {
      latestLeafId = this.resolveLatestLeafDescendant(childIds[0], visiting)

      for (let i = 1; i < childIds.length; i++) {
        const candidateLeafId = this.resolveLatestLeafDescendant(childIds[i], visiting)
        const candidateLeaf = this.getNodeById(candidateLeafId)
        const currentLatestLeaf = this.getNodeById(latestLeafId)
        if (this.compareNodesByDate(candidateLeaf, currentLatestLeaf) > 0) {
          latestLeafId = candidateLeafId
        }
      }
    }

    visiting.delete(nodeId)
    this.latestLeafByNodeId.set(nodeId, latestLeafId)
    return latestLeafId
  }

  private compareNodesByDate(a: ChatMessage, b: ChatMessage) {
    // Ids are expected to be UUID v7
    if (a.id < b.id) return -1
    if (a.id > b.id) return 1
    return 0
  }
}
