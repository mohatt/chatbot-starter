import { describe, expect, it } from 'vitest'
import { ChatTree } from '@/lib/ai/chat-tree'
import type { ChatMessage } from '@/lib/ai'

const IDs = {
  u0: '019529f0-0000-7000-8000-000000000001',
  a0: '019529f0-0000-7000-8000-000000000002',
  u1v1: '019529f0-0000-7000-8000-000000000003',
  a1v1: '019529f0-0000-7000-8000-000000000004',
  a1v2: '019529f0-0000-7000-8000-000000000005',
  u2OnA1v2: '019529f0-0000-7000-8000-000000000006',
  a2OnA1v2: '019529f0-0000-7000-8000-000000000007',
  u1v2Edited: '019529f0-0000-7000-8000-000000000008',
  a1FromU1v2Edited: '019529f0-0000-7000-8000-000000000009',
  a1v3: '019529f0-0000-7000-8000-000000000010',
} as const

type MessageInit = {
  id: string
  role: ChatMessage['role']
  parentId: ChatMessage['metadata']['parentId']
  text?: string
}

function message({ id, role, parentId, text }: MessageInit): ChatMessage {
  return {
    id,
    role,
    parts: text != null ? [{ type: 'text', text }] : [],
    metadata: { parentId },
  }
}

function idsOf(messages: ReadonlyArray<{ id: string }>) {
  return messages.map((msg) => msg.id)
}

const testMessages: ChatMessage[] = [
  message({
    id: IDs.u0,
    role: 'user',
    parentId: null,
    text: 'Give me options for a Tokyo trip.',
  }),
  message({
    id: IDs.a0,
    role: 'assistant',
    parentId: IDs.u0,
    text: 'Sure. What budget and trip length do you have?',
  }),
  message({
    id: IDs.u1v1,
    role: 'user',
    parentId: IDs.a0,
    text: 'Budget is around $2,000 for 6 days.',
  }),
  message({
    id: IDs.a1v1,
    role: 'assistant',
    parentId: IDs.u1v1,
    text: 'Version 1: split between Shinjuku and Asakusa.',
  }),
  message({
    id: IDs.a1v2,
    role: 'assistant',
    parentId: IDs.u1v1,
    text: 'Version 2: base in Ueno and day-trip to Kamakura.',
  }),
  message({
    id: IDs.u2OnA1v2,
    role: 'user',
    parentId: IDs.a1v2,
    text: 'Expand version 2 with a detailed day plan.',
  }),
  message({
    id: IDs.a2OnA1v2,
    role: 'assistant',
    parentId: IDs.u2OnA1v2,
    text: 'Detailed 6-day plan for the version 2 branch.',
  }),
  message({
    id: IDs.u1v2Edited,
    role: 'user',
    parentId: IDs.a0,
    text: 'Actually budget is $2,800 and I prefer food neighborhoods.',
  }),
  message({
    id: IDs.a1FromU1v2Edited,
    role: 'assistant',
    parentId: IDs.u1v2Edited,
    text: 'Plan optimized for $2,800 and food-focused neighborhoods.',
  }),
]

describe('ChatTree (happy path)', () => {
  it('builds latest path and supports explicit branch selection by leaf id', () => {
    const tree = new ChatTree(testMessages)

    const latestPath = tree.buildLatestPath()
    expect(idsOf(latestPath)).toEqual([IDs.u0, IDs.a0, IDs.u1v2Edited, IDs.a1FromU1v2Edited])

    const v2Path = tree.buildPathFromLeafNode(IDs.a2OnA1v2)
    expect(idsOf(v2Path)).toEqual([IDs.u0, IDs.a0, IDs.u1v1, IDs.a1v2, IDs.u2OnA1v2, IDs.a2OnA1v2])

    const variants = tree.getNodeVariants(IDs.a1v2)
    expect(variants).toEqual([IDs.a1v1, IDs.a1v2])

    const switched = tree.buildPathFromLeafNode(IDs.a1v1)
    expect(idsOf(switched)).toEqual([IDs.u0, IDs.a0, IDs.u1v1, IDs.a1v1])
  })

  it('returns latest node id (global and by role)', () => {
    const tree = new ChatTree(testMessages)

    expect(tree.getLatestNodeId()).toBe(IDs.a1FromU1v2Edited)
    expect(tree.getLatestNodeId('assistant')).toBe(IDs.a1FromU1v2Edited)
    expect(tree.getLatestNodeId('user')).toBe(IDs.u1v2Edited)
  })

  it('returns latest descendant for a branch parent', () => {
    const tree = new ChatTree(testMessages)

    const latestLeaf = tree.findLatestLeafDescendant(IDs.u1v1)
    expect(latestLeaf).toBe(IDs.a2OnA1v2)
    expect(idsOf(tree.buildPathFromLeafNode(latestLeaf))).toEqual([
      IDs.u0,
      IDs.a0,
      IDs.u1v1,
      IDs.a1v2,
      IDs.u2OnA1v2,
      IDs.a2OnA1v2,
    ])
  })

  it('updates a node object reference while preserving lineage', () => {
    const tree = new ChatTree(testMessages)
    const previousTail = tree.getNodeById(IDs.a1FromU1v2Edited)

    const streamedTail: ChatMessage = {
      ...previousTail,
      parts: [{ type: 'text', text: 'streaming update' }],
    }

    tree.updateNode(streamedTail)

    const nextPath = tree.buildLatestPath()
    expect(nextPath[nextPath.length - 1]).toBe(streamedTail)
    expect(idsOf(nextPath)).toEqual([IDs.u0, IDs.a0, IDs.u1v2Edited, IDs.a1FromU1v2Edited])
  })

  it('invalidates latest-leaf cache when new descendants are appended', () => {
    const tree = new ChatTree(testMessages)
    const initialLatest = tree.findLatestLeafDescendant(IDs.u1v1)
    expect(initialLatest).toBe(IDs.a2OnA1v2)

    tree.addNode(
      message({
        id: '019529f0-0000-7000-8000-000000000011',
        role: 'user',
        parentId: IDs.a1v1,
        text: 'Continue version 1 instead.',
      }),
    )
    tree.addNode(
      message({
        id: '019529f0-0000-7000-8000-000000000012',
        role: 'assistant',
        parentId: '019529f0-0000-7000-8000-000000000011',
        text: 'Detailed continuation on branch version 1.',
      }),
    )

    const latestAfterAppend = tree.findLatestLeafDescendant(IDs.u1v1)
    expect(latestAfterAppend).toBe('019529f0-0000-7000-8000-000000000012')
    expect(idsOf(tree.buildLatestPath())).toEqual([
      IDs.u0,
      IDs.a0,
      IDs.u1v1,
      IDs.a1v1,
      '019529f0-0000-7000-8000-000000000011',
      '019529f0-0000-7000-8000-000000000012',
    ])
  })

  it('throws for missing parents', () => {
    const tree = new ChatTree(testMessages)
    expect(() =>
      tree.addNode(
        message({
          id: '019529f0-0000-7000-8000-000000000011',
          role: 'assistant',
          parentId: 'missing-parent',
          text: 'Invalid parent id',
        }),
      ),
    ).toThrow('Parent message not found')
  })

  it('throws when siblings under same parent have mixed roles', () => {
    const tree = new ChatTree(testMessages)
    expect(() =>
      tree.addNode(
        message({
          id: '019529f0-0000-7000-8000-000000000011',
          role: 'user',
          parentId: IDs.u1v1,
          text: 'Invalid sibling role under same parent.',
        }),
      ),
    ).toThrow('mixed child roles')
  })

  it('throws when message ids are not increasing (uuid v7 order)', () => {
    expect(
      () =>
        new ChatTree([
          message({
            id: '019529f0-0000-7000-8000-000000000010',
            role: 'user',
            parentId: null,
            text: 'Later first',
          }),
          message({
            id: '019529f0-0000-7000-8000-000000000009',
            role: 'assistant',
            parentId: '019529f0-0000-7000-8000-000000000010',
            text: 'Earlier second',
          }),
        ]),
    ).toThrow('Message ID must be increasing')

    expect(
      () =>
        new ChatTree([
          message({
            id: '019529f0-0000-7000-8000-000000000010',
            role: 'user',
            parentId: null,
            text: 'First',
          }),
          message({
            id: '019529f0-0000-7000-8000-000000000010',
            role: 'assistant',
            parentId: '019529f0-0000-7000-8000-000000000010',
            text: 'Second with same id',
          }),
        ]),
    ).toThrow('Duplicate message ID')

    const tree = new ChatTree(testMessages)
    expect(() =>
      tree.addNode(
        message({
          id: '019529f0-0000-7000-8000-000000000000',
          role: 'assistant',
          parentId: IDs.u1v2Edited,
          text: 'Older message appended after newer history',
        }),
      ),
    ).toThrow('Message ID must be increasing')
  })

  it('throws for duplicate message ids', () => {
    const tree = new ChatTree(testMessages)
    expect(() =>
      tree.addNode(
        message({
          id: IDs.a1FromU1v2Edited,
          role: 'assistant',
          parentId: IDs.u1v2Edited,
          text: 'Duplicate id',
        }),
      ),
    ).toThrow('Duplicate message ID')
  })

  it('enforces immutable role and parent on updateNode', () => {
    const tree = new ChatTree(testMessages)
    const original = tree.getNodeById(IDs.a1v1)

    expect(() =>
      tree.updateNode({
        ...original,
        role: 'user',
      } as ChatMessage),
    ).toThrow('role is immutable')

    expect(() =>
      tree.updateNode({
        ...original,
        metadata: { ...original.metadata, parentId: IDs.a0 },
      } as ChatMessage),
    ).toThrow('parentId is immutable')
  })
})
