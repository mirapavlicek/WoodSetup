import * as THREE from 'three';
import type { Joint, Piece } from '../types';
import { getProfile } from '../data/lumber';
import { getJointType } from '../data/joints';

function deg(d: number) {
  return (d * Math.PI) / 180;
}

function applyTransform(
  obj: THREE.Object3D,
  position: [number, number, number],
  rotation: [number, number, number],
) {
  obj.position.set(position[0], position[1], position[2]);
  obj.rotation.set(deg(rotation[0]), deg(rotation[1]), deg(rotation[2]), 'XYZ');
}

/** Vrátí jeden boxový mesh pro prvek, bez materiálu (přiřazuje volající). */
export function buildPieceMesh(piece: Piece): THREE.Mesh | null {
  const profile = getProfile(piece.profileId);
  if (!profile) return null;
  const geometry = new THREE.BoxGeometry(
    profile.width,
    profile.height,
    piece.length,
  );
  const mesh = new THREE.Mesh(geometry);
  applyTransform(mesh, piece.position, piece.rotation);
  mesh.userData = {
    pieceId: piece.id,
    profile: profile.name,
    width: profile.width,
    height: profile.height,
    length: piece.length,
  };
  return mesh;
}

/** Vrátí složený THREE.Group pro spojku, podle její kategorie. */
export function buildJointGroup(joint: Joint): THREE.Group | null {
  const type = getJointType(joint.typeId);
  if (!type) return null;
  const length = type.length;
  const size = type.size;
  const group = new THREE.Group();

  const addMesh = (
    geometry: THREE.BufferGeometry,
    position?: [number, number, number],
    rotation?: [number, number, number],
    parent: THREE.Object3D = group,
  ) => {
    const m = new THREE.Mesh(geometry);
    if (position) m.position.set(...position);
    if (rotation) m.rotation.set(rotation[0], rotation[1], rotation[2], 'XYZ');
    parent.add(m);
    return m;
  };

  switch (type.category) {
    case 'vrut': {
      const inner = new THREE.Group();
      inner.rotation.x = Math.PI / 2;
      addMesh(
        new THREE.CylinderGeometry(size / 2, size / 2, length, 12),
        undefined,
        undefined,
        inner,
      );
      addMesh(
        new THREE.CylinderGeometry(size, size, size * 0.6, 14),
        [0, length / 2, 0],
        undefined,
        inner,
      );
      group.add(inner);
      break;
    }
    case 'zavit':
    case 'cep': {
      const inner = new THREE.Group();
      inner.rotation.x = Math.PI / 2;
      addMesh(
        new THREE.CylinderGeometry(size / 2, size / 2, length, 12),
        undefined,
        undefined,
        inner,
      );
      group.add(inner);
      break;
    }
    case 'hrebik': {
      const inner = new THREE.Group();
      inner.rotation.x = Math.PI / 2;
      addMesh(
        new THREE.CylinderGeometry(size / 2, size / 2, length, 10),
        undefined,
        undefined,
        inner,
      );
      addMesh(
        new THREE.CylinderGeometry(size * 1.4, size * 1.4, size * 0.3, 14),
        [0, length / 2, 0],
        undefined,
        inner,
      );
      group.add(inner);
      break;
    }
    case 'hmozdinka': {
      const inner = new THREE.Group();
      inner.rotation.x = Math.PI / 2;
      addMesh(
        new THREE.CylinderGeometry(size / 2, size / 2, length, 12),
        undefined,
        undefined,
        inner,
      );
      addMesh(
        new THREE.CylinderGeometry(size * 1.1, size / 2, size * 0.8, 14),
        [0, length / 2, 0],
        undefined,
        inner,
      );
      group.add(inner);
      break;
    }
    case 'plotna': {
      addMesh(new THREE.BoxGeometry(length, 3, size));
      break;
    }
    case 'uhelnik': {
      addMesh(new THREE.BoxGeometry(length, 3, size), [0, size / 2, 0]);
      addMesh(new THREE.BoxGeometry(length, size, 3), [0, 0, size / 2]);
      break;
    }
    case 'botka': {
      addMesh(new THREE.BoxGeometry(size, 3, length), [0, 0, 0]);
      addMesh(
        new THREE.BoxGeometry(3, length * 0.8, length),
        [-size / 2, length * 0.4, 0],
      );
      addMesh(
        new THREE.BoxGeometry(3, length * 0.8, length),
        [size / 2, length * 0.4, 0],
      );
      addMesh(
        new THREE.BoxGeometry(size * 0.5, length * 0.8, 3),
        [-size / 2 - size * 0.25, length * 0.4, length / 2 + 1.5],
      );
      addMesh(
        new THREE.BoxGeometry(size * 0.5, length * 0.8, 3),
        [size / 2 + size * 0.25, length * 0.4, length / 2 + 1.5],
      );
      break;
    }
    case 'patka': {
      addMesh(new THREE.BoxGeometry(size + 60, 6, size + 60), [0, 0, 0]);
      addMesh(
        new THREE.BoxGeometry(3, length, size),
        [-size / 2 - 1.5, length / 2, 0],
      );
      addMesh(
        new THREE.BoxGeometry(3, length, size),
        [size / 2 + 1.5, length / 2, 0],
      );
      break;
    }
    case 'spona': {
      addMesh(new THREE.BoxGeometry(length, 2, size));
      if (type.id === 'spona-t-150') {
        addMesh(new THREE.BoxGeometry(size, 2, size * 2), [0, 0, size]);
      }
      if (type.id === 'spona-krokvova') {
        addMesh(
          new THREE.BoxGeometry(length / 2, 2, size),
          [length / 4, length / 8, 0],
          [0, 0, -Math.PI / 4],
        );
      }
      break;
    }
    case 'vaznikova-deska': {
      addMesh(new THREE.BoxGeometry(length, 2, size));
      break;
    }
    default:
      addMesh(new THREE.SphereGeometry(6, 12, 12));
  }

  applyTransform(group, joint.position, joint.rotation);
  group.userData = {
    jointId: joint.id,
    type: type.name,
  };
  return group;
}
