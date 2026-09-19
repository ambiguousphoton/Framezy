import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { reorderInProject } from './reorderShots';
import { SHOT_COLORS, batchShotColor, isShotColor, randomShotColor } from './theme';
import {
  DEFAULT_FPS,
  PIPELINES,
  toDueAt,
  isValidFps,
  type Note,
  type PipelineId,
  type Project,
  type Shot,
} from './types';

const PROJECTS_KEY = 'projects.v1';
const SHOTS_KEY = 'shots.v2';
/** Flat shot list from before projects existed. Migrated on first load, then ignored. */
const LEGACY_SHOTS_KEY = 'shots.v1';

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isPipelineId(value: unknown): value is PipelineId {
  return typeof value === 'string' && value in PIPELINES;
}

function isNote(value: unknown): value is Note {
  if (typeof value !== 'object' || value === null) return false;
  const n = value as Record<string, unknown>;
  return (
    typeof n.id === 'string' &&
    typeof n.text === 'string' &&
    typeof n.addressed === 'boolean' &&
    (n.frame === null || typeof n.frame === 'number')
  );
}

function isProject(value: unknown): value is Project {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    isPipelineId(p.pipeline) &&
    typeof p.createdAt === 'string'
  );
}

/** Fills in fields added after a shot was first stored, so old data still loads. */
function normalizeShot(shot: Shot, index: number): Shot {
  const color = isShotColor(shot.color) ? shot.color : SHOT_COLORS[index % SHOT_COLORS.length];
  const fps = isValidFps(shot.fps) ? shot.fps : DEFAULT_FPS;
  const description = typeof shot.description === 'string' ? shot.description : '';
  const due = toDueAt(shot.due);
  return color === shot.color &&
    fps === shot.fps &&
    description === shot.description &&
    due === shot.due
    ? shot
    : { ...shot, color, fps, description, due };
}

function normalizeProject(project: Project): Project {
  const fps = isValidFps(project.fps) ? project.fps : DEFAULT_FPS;
  const description = typeof project.description === 'string' ? project.description : '';
  const expectedCompletion = toDueAt(project.expectedCompletion);
  return fps === project.fps &&
    description === project.description &&
    expectedCompletion === project.expectedCompletion
    ? project
    : { ...project, fps, description, expectedCompletion };
}

function isShot(value: unknown): value is Shot {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    typeof s.projectId === 'string' &&
    typeof s.code === 'string' &&
    typeof s.frames === 'number' &&
    isPipelineId(s.pipeline) &&
    typeof s.stageIndex === 'number' &&
    typeof s.version === 'number' &&
    (s.due === null || typeof s.due === 'string') &&
    Array.isArray(s.notes) &&
    s.notes.every(isNote)
  );
}

/** Wraps pre-project shots into a single catch-all project so nothing is lost. */
function migrateLegacyShots(raw: string): { project: Project; shots: Shot[] } | null {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length === 0) return null;

  const project: Project = {
    id: newId(),
    name: 'Imported shots',
    description: '',
    pipeline: '3d',
    fps: DEFAULT_FPS,
    expectedCompletion: null,
    createdAt: new Date().toISOString(),
  };

  const shots = parsed
    .map((entry) => (typeof entry === 'object' && entry !== null ? { ...entry, projectId: project.id } : entry))
    .filter(isShot);

  return shots.length > 0 ? { project, shots } : null;
}

export type AddShotInput = {
  code: string;
  frames: number;
  pipeline: PipelineId;
  fps: number;
};

export type BulkShotInput = {
  code: string;
  frames: number;
  stageIndex: number;
};

export function useStore() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [shots, setShots] = useState<Shot[]>([]);
  // Guards the first write so empty initial state can't clobber stored data.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.multiGet([PROJECTS_KEY, SHOTS_KEY, LEGACY_SHOTS_KEY])
      .then((entries) => {
        if (cancelled) return;
        const stored = Object.fromEntries(entries);

        const rawProjects = stored[PROJECTS_KEY];
        const rawShots = stored[SHOTS_KEY];

        if (rawProjects || rawShots) {
          if (rawProjects) {
            const parsed: unknown = JSON.parse(rawProjects);
            if (Array.isArray(parsed)) setProjects(parsed.filter(isProject).map(normalizeProject));
          }
          if (rawShots) {
            const parsed: unknown = JSON.parse(rawShots);
            if (Array.isArray(parsed)) setShots(parsed.filter(isShot).map(normalizeShot));
          }
        } else if (stored[LEGACY_SHOTS_KEY]) {
          const migrated = migrateLegacyShots(stored[LEGACY_SHOTS_KEY]);
          if (migrated) {
            setProjects([normalizeProject(migrated.project)]);
            setShots(migrated.shots.map(normalizeShot));
          }
        }
      })
      .catch((err) => console.warn('Failed to load data', err))
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.multiSet([
      [PROJECTS_KEY, JSON.stringify(projects)],
      [SHOTS_KEY, JSON.stringify(shots)],
    ]).catch((err) => console.warn('Failed to save data', err));
  }, [projects, shots, loaded]);

  // --- projects ---

  const addProject = useCallback((name: string, pipeline: PipelineId, fps = DEFAULT_FPS) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setProjects((prev) => [
      {
        id: newId(),
        name: trimmed,
        description: '',
        pipeline,
        fps: isValidFps(fps) ? fps : DEFAULT_FPS,
        expectedCompletion: null,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  }, []);

  const setProjectPipeline = useCallback((id: string, pipeline: PipelineId) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, pipeline } : p)));
  }, []);

  /**
   * Commits a batch of edits from the project options sheet in one go, so the
   * sheet can hold a draft and only write when the user saves.
   */
  const saveProject = useCallback(
    (id: string, patch: Partial<Omit<Project, 'id' | 'createdAt'>>) => {
      setProjects((prev) =>
        prev.map((project) => {
          if (project.id !== id) return project;
          const merged = { ...project, ...patch };
          return {
            ...merged,
            name: merged.name.trim() || project.name,
            fps: isValidFps(merged.fps) ? merged.fps : project.fps,
            expectedCompletion: toDueAt(merged.expectedCompletion),
          };
        })
      );
    },
    []
  );

  /** Removes the project and every shot inside it. */
  const removeProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setShots((prev) => prev.filter((s) => s.projectId !== id));
  }, []);

  // --- shots ---

  const updateShot = useCallback((id: string, fn: (shot: Shot) => Shot) => {
    setShots((prev) => prev.map((s) => (s.id === id ? fn(s) : s)));
  }, []);

  const addShot = useCallback((projectId: string, { code, frames, pipeline, fps }: AddShotInput) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setShots((prev) => [
      {
        id: newId(),
        projectId,
        code: trimmed,
        description: '',
        frames: Math.max(0, Math.round(frames)),
        color: randomShotColor(prev.find((s) => s.projectId === projectId)?.color),
        fps: isValidFps(fps) ? fps : DEFAULT_FPS,
        pipeline,
        stageIndex: 0,
        version: 1,
        due: null,
        notes: [],
      },
      ...prev,
    ]);
  }, []);

  /** Bulk insert from a pasted shot list, keeping the pasted order. */
  const addShots = useCallback(
    (projectId: string, pipeline: PipelineId, fps: number, entries: BulkShotInput[]) => {
      if (entries.length === 0) return;
      const lastIndex = PIPELINES[pipeline].stages.length - 1;
      const seed = Math.floor(Math.random() * SHOT_COLORS.length);
      const batch: Shot[] = entries.map((entry, offset) => ({
        // Date.now() is the same across a synchronous batch, so offset keeps ids unique.
        id: `${Date.now()}-${offset}-${Math.random().toString(36).slice(2, 8)}`,
        projectId,
        code: entry.code.trim(),
        description: '',
        frames: Math.max(0, Math.round(entry.frames)),
        color: batchShotColor(offset, seed),
        fps: isValidFps(fps) ? fps : DEFAULT_FPS,
        pipeline,
        stageIndex: Math.max(0, Math.min(entry.stageIndex, lastIndex)),
        version: 1,
        due: null,
        notes: [],
      }));
      setShots((prev) => [...batch, ...prev]);
    },
    []
  );

  /** Advances one stage; wraps back to the first stage once past final. */
  const advanceStage = useCallback(
    (id: string) => {
      updateShot(id, (shot) => {
        const lastIndex = PIPELINES[shot.pipeline].stages.length - 1;
        return { ...shot, stageIndex: shot.stageIndex >= lastIndex ? 0 : shot.stageIndex + 1 };
      });
    },
    [updateShot]
  );

  /**
   * Commits a batch of edits from the shot sheet in one go, so the sheet can hold
   * a draft and only write when the user saves. All clamping lives here.
   */
  const saveShot = useCallback(
    (id: string, patch: Partial<Omit<Shot, 'id' | 'projectId'>>) => {
      updateShot(id, (shot) => {
        const merged = { ...shot, ...patch };
        const lastIndex = PIPELINES[merged.pipeline].stages.length - 1;
        return {
          ...merged,
          code: merged.code.trim() || shot.code,
          frames: Math.max(0, Math.round(merged.frames)),
          stageIndex: Math.max(0, Math.min(merged.stageIndex, lastIndex)),
          version: Math.max(1, Math.round(merged.version)),
          color: isShotColor(merged.color) ? merged.color : shot.color,
          fps: isValidFps(merged.fps) ? merged.fps : shot.fps,
          due: toDueAt(merged.due),
        };
      });
    },
    [updateShot]
  );

  const removeShot = useCallback((id: string) => {
    setShots((prev) => prev.filter((s) => s.id !== id));
  }, []);

  /**
   * Reorders within one project. `from`/`to` index that project's shots, not the
   * flat list, so other projects' shots keep the slots they already occupy.
   */
  const reorderShots = useCallback((projectId: string, from: number, to: number) => {
    setShots((prev) => reorderInProject(prev, projectId, from, to));
  }, []);

  return {
    projects,
    shots,
    loaded,
    addProject,
    setProjectPipeline,
    saveProject,
    removeProject,
    addShot,
    addShots,
    advanceStage,
    saveShot,
    removeShot,
    reorderShots,
  };
}

export type Store = ReturnType<typeof useStore>;
