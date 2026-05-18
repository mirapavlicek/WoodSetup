import type { Joint, Piece } from '../types';

export type ConnectedGroup = {
  pieceIds: Set<string>;
  jointIds: Set<string>;
};

/**
 * Najde všechny prvky a spojky, které jsou s `rootId` spojené přes joint.connects.
 * Vrací množinu obsahující i samotný kořen.
 *
 * Pravidla:
 * - Spojka J s `connects` = [A] nebo [A, B] vytvoří hrany J↔A (a J↔B).
 * - Spojka bez `connects` je samostatná (jen ona sama).
 */
export function connectedGroup(
  rootId: string,
  pieces: Piece[],
  joints: Joint[],
): ConnectedGroup {
  const pieceIds = new Set<string>();
  const jointIds = new Set<string>();

  const piecesById = new Map(pieces.map((p) => [p.id, p]));
  const jointsById = new Map(joints.map((j) => [j.id, j]));

  // adjacency: piece -> joints
  const pieceToJoints = new Map<string, string[]>();
  for (const j of joints) {
    if (!j.connects) continue;
    for (const pid of j.connects) {
      if (!pid) continue;
      if (!piecesById.has(pid)) continue;
      const list = pieceToJoints.get(pid);
      if (list) list.push(j.id);
      else pieceToJoints.set(pid, [j.id]);
    }
  }

  const queue: { id: string; kind: 'piece' | 'joint' }[] = [];

  if (piecesById.has(rootId)) {
    pieceIds.add(rootId);
    queue.push({ id: rootId, kind: 'piece' });
  } else if (jointsById.has(rootId)) {
    jointIds.add(rootId);
    queue.push({ id: rootId, kind: 'joint' });
  } else {
    return { pieceIds, jointIds };
  }

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node.kind === 'piece') {
      const adj = pieceToJoints.get(node.id);
      if (!adj) continue;
      for (const jid of adj) {
        if (jointIds.has(jid)) continue;
        jointIds.add(jid);
        queue.push({ id: jid, kind: 'joint' });
      }
    } else {
      const j = jointsById.get(node.id);
      if (!j || !j.connects) continue;
      for (const pid of j.connects) {
        if (!pid) continue;
        if (pieceIds.has(pid)) continue;
        if (!piecesById.has(pid)) continue;
        pieceIds.add(pid);
        queue.push({ id: pid, kind: 'piece' });
      }
    }
  }

  return { pieceIds, jointIds };
}

/** True, pokud má `rootId` aspoň jeden další spojený prvek nebo spojku. */
export function hasGroupLinks(
  rootId: string,
  pieces: Piece[],
  joints: Joint[],
): boolean {
  const g = connectedGroup(rootId, pieces, joints);
  return g.pieceIds.size + g.jointIds.size > 1;
}
