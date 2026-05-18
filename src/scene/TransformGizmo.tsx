import { useEffect, useState } from 'react';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { useDesignStore } from '../store/designStore';
import { snap } from '../utils/units';
import type { Anchor, Vec3 } from '../types';
import { pieceHalfExtents } from '../utils/anchor';
import { connectedGroup } from '../utils/connections';

const _euler = new THREE.Euler();
const _quat = new THREE.Quaternion();

function eulerDegToQuat(rot: Vec3): THREE.Quaternion {
  _euler.set(
    THREE.MathUtils.degToRad(rot[0]),
    THREE.MathUtils.degToRad(rot[1]),
    THREE.MathUtils.degToRad(rot[2]),
    'XYZ',
  );
  return new THREE.Quaternion().setFromEuler(_euler);
}

function rotateLocalOffset(v: THREE.Vector3, rotationDeg: Vec3): THREE.Vector3 {
  _euler.set(
    THREE.MathUtils.degToRad(rotationDeg[0]),
    THREE.MathUtils.degToRad(rotationDeg[1]),
    THREE.MathUtils.degToRad(rotationDeg[2]),
    'XYZ',
  );
  _quat.setFromEuler(_euler);
  return v.clone().applyQuaternion(_quat);
}

function pivotLocalOffset(
  half: Vec3 | null,
  anchor: Anchor,
): THREE.Vector3 | null {
  if (!half) return null;
  return new THREE.Vector3(
    anchor[0] * half[0],
    anchor[1] * half[1],
    anchor[2] * half[2],
  );
}

/**
 * Vrátí novou pozici a rotaci prvku po aplikaci světové matice T.
 */
function transformObject(
  obj: { position: Vec3; rotation: Vec3 },
  T: THREE.Matrix4,
): { position: Vec3; rotation: Vec3 } {
  const oldQuat = eulerDegToQuat(obj.rotation);
  const oldM = new THREE.Matrix4().compose(
    new THREE.Vector3(obj.position[0], obj.position[1], obj.position[2]),
    oldQuat,
    new THREE.Vector3(1, 1, 1),
  );
  const newM = T.clone().multiply(oldM);
  const newPos = new THREE.Vector3();
  const newQuat = new THREE.Quaternion();
  const newScale = new THREE.Vector3();
  newM.decompose(newPos, newQuat, newScale);
  const e = new THREE.Euler().setFromQuaternion(newQuat, 'XYZ');
  return {
    position: [newPos.x, newPos.y, newPos.z],
    rotation: [
      THREE.MathUtils.radToDeg(e.x),
      THREE.MathUtils.radToDeg(e.y),
      THREE.MathUtils.radToDeg(e.z),
    ],
  };
}

/**
 * Gizmo nad vybraným prvkem / spojkou.
 * Pomocná <group> drží dočasnou transformaci; po skončení dragu zapíšeme stav do storu.
 * - Pokud je rotationPivot ≠ střed, dummy stojí na zvolené hraně / rohu.
 * - Pokud je linkConnected = true a prvek je sešroubovaný s dalšími,
 *   světová transformace gizma se aplikuje na celý spojený grupu (rigid link).
 */
export default function TransformGizmo() {
  const selectedId = useDesignStore((s) => s.selectedId);
  const pieces = useDesignStore((s) => s.pieces);
  const joints = useDesignStore((s) => s.joints);
  const transformMode = useDesignStore((s) => s.transformMode);
  const gridSize = useDesignStore((s) => s.gridSize);
  const angleSnap = useDesignStore((s) => s.angleSnap);
  const rotationPivot = useDesignStore((s) => s.rotationPivot);
  const linkConnected = useDesignStore((s) => s.linkConnected);
  const updatePiece = useDesignStore((s) => s.updatePiece);
  const updateJoint = useDesignStore((s) => s.updateJoint);
  const applyGroupTransform = useDesignStore((s) => s.applyGroupTransform);
  const checkPieceBelowSurface = useDesignStore((s) => s.checkPieceBelowSurface);
  const magnetSnapPiece = useDesignStore((s) => s.magnetSnapPiece);
  const magnetSnapJoint = useDesignStore((s) => s.magnetSnapJoint);
  const setGizmoDragging = useDesignStore((s) => s.setGizmoDragging);

  const [group, setGroup] = useState<THREE.Group | null>(null);

  const piece = pieces.find((p) => p.id === selectedId);
  const joint = !piece ? joints.find((j) => j.id === selectedId) : undefined;
  const target = piece ?? joint;

  const half = piece ? pieceHalfExtents(piece) : null;
  const pivot: Anchor = piece ? rotationPivot : [0, 0, 0];
  const localOffset = piece
    ? pivotLocalOffset(half, pivot) ?? new THREE.Vector3()
    : new THREE.Vector3();
  const usingPivot =
    piece && half && (pivot[0] !== 0 || pivot[1] !== 0 || pivot[2] !== 0);

  useEffect(() => {
    if (!group || !target) return;
    const rotDeg: Vec3 = [
      target.rotation[0],
      target.rotation[1],
      target.rotation[2],
    ];
    if (usingPivot) {
      const offWorld = rotateLocalOffset(localOffset, rotDeg);
      group.position.set(
        target.position[0] + offWorld.x,
        target.position[1] + offWorld.y,
        target.position[2] + offWorld.z,
      );
    } else {
      group.position.set(target.position[0], target.position[1], target.position[2]);
    }
    group.rotation.set(
      THREE.MathUtils.degToRad(rotDeg[0]),
      THREE.MathUtils.degToRad(rotDeg[1]),
      THREE.MathUtils.degToRad(rotDeg[2]),
      'XYZ',
    );
    group.updateMatrixWorld(true);
  }, [
    group,
    target?.id,
    target?.position[0],
    target?.position[1],
    target?.position[2],
    target?.rotation[0],
    target?.rotation[1],
    target?.rotation[2],
    usingPivot,
    localOffset.x,
    localOffset.y,
    localOffset.z,
  ]);

  const handleMouseDown = () => {
    setGizmoDragging(true);
  };

  const handleMouseUp = () => {
    setGizmoDragging(false);
    if (!group || !target) return;

    // Snapped pivot world position after drag
    const snappedPivot = new THREE.Vector3(
      snap(group.position.x, gridSize),
      snap(group.position.y, gridSize),
      snap(group.position.z, gridSize),
    );
    // Snapped rotation (degrees, XYZ Euler)
    const rotDeg: Vec3 = [
      snap((group.rotation.x * 180) / Math.PI, angleSnap),
      snap((group.rotation.y * 180) / Math.PI, angleSnap),
      snap((group.rotation.z * 180) / Math.PI, angleSnap),
    ];
    const newQuat = eulerDegToQuat(rotDeg);

    // Old pivot world: derived from target.position + R_old * localOffset
    const oldQuat = eulerDegToQuat(target.rotation);
    const oldPivotWorld = new THREE.Vector3(
      target.position[0],
      target.position[1],
      target.position[2],
    );
    if (usingPivot) {
      const lo = localOffset.clone().applyQuaternion(oldQuat);
      oldPivotWorld.add(lo);
    }

    // World transformation T = T_new * T_old^-1
    const T_old = new THREE.Matrix4().compose(
      oldPivotWorld,
      oldQuat,
      new THREE.Vector3(1, 1, 1),
    );
    const T_new = new THREE.Matrix4().compose(
      snappedPivot,
      newQuat,
      new THREE.Vector3(1, 1, 1),
    );
    const T_world = T_new.clone().multiply(T_old.clone().invert());

    // Find linked group when enabled
    const linked = linkConnected
      ? connectedGroup(target.id, pieces, joints)
      : { pieceIds: new Set<string>(), jointIds: new Set<string>() };
    // Ensure the target itself is always included
    if (piece) linked.pieceIds.add(piece.id);
    if (joint) linked.jointIds.add(joint.id);

    const pieceUpdates: { id: string; position: Vec3; rotation: Vec3 }[] = [];
    const jointUpdates: { id: string; position: Vec3; rotation: Vec3 }[] = [];

    for (const pid of linked.pieceIds) {
      const p = pieces.find((x) => x.id === pid);
      if (!p) continue;
      const r = transformObject(p, T_world);
      pieceUpdates.push({ id: pid, position: r.position, rotation: r.rotation });
    }
    for (const jid of linked.jointIds) {
      const j = joints.find((x) => x.id === jid);
      if (!j) continue;
      const r = transformObject(j, T_world);
      jointUpdates.push({ id: jid, position: r.position, rotation: r.rotation });
    }

    if (pieceUpdates.length + jointUpdates.length === 1) {
      // Pouze samotný cíl – zkrácená cesta s magnet/surface kontrolami.
      if (piece && pieceUpdates.length === 1) {
        const u = pieceUpdates[0];
        updatePiece(u.id, { position: u.position, rotation: u.rotation });
        magnetSnapPiece(u.id);
        checkPieceBelowSurface(u.id);
      } else if (joint && jointUpdates.length === 1) {
        const u = jointUpdates[0];
        updateJoint(u.id, { position: u.position, rotation: u.rotation });
        magnetSnapJoint(u.id);
      }
    } else {
      applyGroupTransform({ pieces: pieceUpdates, joints: jointUpdates });
      // Magnet a kontrolu pod povrchem spustíme pouze pro samotný cíl.
      if (piece) {
        magnetSnapPiece(piece.id);
        checkPieceBelowSurface(piece.id);
      } else if (joint) {
        magnetSnapJoint(joint.id);
      }
    }
  };

  return (
    <>
      <group ref={setGroup} />
      {target && group && (
        <TransformControls
          object={group}
          mode={transformMode}
          translationSnap={gridSize}
          rotationSnap={(angleSnap * Math.PI) / 180}
          showX
          showY
          showZ
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          size={0.9}
        />
      )}
    </>
  );
}

