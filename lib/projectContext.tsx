"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { subscribeKeywords, subscribeProjects } from "./firestore";
import type { KeywordEntry, Project } from "./types";

interface ProjectContextValue {
  projects: Project[];
  loading: boolean;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string) => void;
  selectedProject: Project | null;
  keywords: KeywordEntry[];
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

const STORAGE_KEY = "content-dashboard:selectedProjectId";

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectIdState] = useState<string | null>(null);
  const [keywords, setKeywords] = useState<KeywordEntry[]>([]);

  useEffect(() => {
    const unsub = subscribeProjects((loaded) => {
      setProjects(loaded);
      setLoading(false);
      setSelectedProjectIdState((current) => {
        if (current) return current;
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored && loaded.some((p) => p.id === stored)) return stored;
        return loaded[0]?.id ?? null;
      });
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    return subscribeKeywords(selectedProjectId, setKeywords);
  }, [selectedProjectId]);

  function setSelectedProjectId(id: string) {
    setSelectedProjectIdState(id);
    window.localStorage.setItem(STORAGE_KEY, id);
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  return (
    <ProjectContext.Provider
      value={{
        projects,
        loading,
        selectedProjectId,
        setSelectedProjectId,
        selectedProject,
        keywords,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProjectContext must be used within ProjectProvider");
  return ctx;
}
