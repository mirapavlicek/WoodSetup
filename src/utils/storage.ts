import { v4 as uuid } from 'uuid';
import type { DesignSnapshot, SavedProject } from '../types';

const STORAGE_KEY = 'woodsetup.projects.v1';

function readAll(): SavedProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedProject[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writeAll(projects: SavedProject[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function listProjects(): SavedProject[] {
  return readAll().sort((a, b) => b.savedAt - a.savedAt);
}

export function saveProject(name: string, data: DesignSnapshot): SavedProject {
  const projects = readAll();
  const existing = projects.find((p) => p.name === name);
  const project: SavedProject = {
    id: existing?.id ?? uuid(),
    name,
    savedAt: Date.now(),
    data,
  };
  const next = existing
    ? projects.map((p) => (p.id === project.id ? project : p))
    : [...projects, project];
  writeAll(next);
  return project;
}

export function deleteProject(id: string): void {
  writeAll(readAll().filter((p) => p.id !== id));
}

export function loadProject(id: string): SavedProject | undefined {
  return readAll().find((p) => p.id === id);
}
