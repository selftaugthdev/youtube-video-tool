import {
  collection,
  collectionGroup,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  ContentItem,
  KeywordEntry,
  PlatformKey,
  PlatformVariant,
  Project,
  TitleBankEntry,
  Topic,
} from "./types";

// ---------- Projects ----------

const projectsCol = () => collection(db, "projects");

export function subscribeProjects(
  cb: (projects: Project[]) => void
): Unsubscribe {
  const q = query(projectsCol(), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Project, "id">) })));
  });
}

export async function getProject(projectId: string): Promise<Project | null> {
  const snap = await getDoc(doc(db, "projects", projectId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Project, "id">) };
}

export async function createProject(
  data: Omit<Project, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(projectsCol(), { ...data, createdAt: Date.now() });
  return ref.id;
}

export async function updateProject(
  projectId: string,
  patch: Partial<Omit<Project, "id">>
): Promise<void> {
  await updateDoc(doc(db, "projects", projectId), { ...patch });
}

export async function deleteProject(projectId: string): Promise<void> {
  await deleteDoc(doc(db, "projects", projectId));
}

// ---------- Keyword bank ----------

const keywordsCol = (projectId: string) =>
  collection(db, "projects", projectId, "keywords");

export function subscribeKeywords(
  projectId: string,
  cb: (keywords: KeywordEntry[]) => void
): Unsubscribe {
  const q = query(keywordsCol(projectId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<KeywordEntry, "id">) }))
    );
  });
}

export async function addKeyword(
  projectId: string,
  phrase: string,
  notes?: string
): Promise<string> {
  const ref = await addDoc(keywordsCol(projectId), {
    phrase,
    notes: notes ?? "",
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function deleteKeyword(
  projectId: string,
  keywordId: string
): Promise<void> {
  await deleteDoc(doc(db, "projects", projectId, "keywords", keywordId));
}

export async function listKeywordsOnce(projectId: string): Promise<KeywordEntry[]> {
  const snap = await getDocs(keywordsCol(projectId));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<KeywordEntry, "id">) }));
}

// ---------- Title bank (proven-to-convert title swipe file) ----------

const titleBankCol = (projectId: string) => collection(db, "projects", projectId, "titleBank");

export function subscribeTitleBank(
  projectId: string,
  cb: (titles: TitleBankEntry[]) => void
): Unsubscribe {
  const q = query(titleBankCol(projectId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TitleBankEntry, "id">) })));
  });
}

export async function addTitleBankEntry(
  projectId: string,
  text: string,
  notes?: string
): Promise<string> {
  const ref = await addDoc(titleBankCol(projectId), {
    text,
    notes: notes ?? "",
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function addTitleBankEntriesBulk(projectId: string, texts: string[]): Promise<void> {
  const batch = writeBatch(db);
  const now = Date.now();
  for (const text of texts) {
    batch.set(doc(titleBankCol(projectId)), { text, notes: "", createdAt: now });
  }
  await batch.commit();
}

export async function deleteTitleBankEntry(projectId: string, titleId: string): Promise<void> {
  await deleteDoc(doc(db, "projects", projectId, "titleBank", titleId));
}

export async function clearTitleBank(projectId: string): Promise<void> {
  const snap = await getDocs(titleBankCol(projectId));
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

export async function listTitleBankOnce(projectId: string): Promise<TitleBankEntry[]> {
  const snap = await getDocs(titleBankCol(projectId));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TitleBankEntry, "id">) }));
}

// ---------- Topic bank (uploaded video topic backlog) ----------

const topicsCol = (projectId: string) => collection(db, "projects", projectId, "topics");

export function subscribeTopics(
  projectId: string,
  cb: (topics: Topic[]) => void
): Unsubscribe {
  const q = query(topicsCol(projectId), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Topic, "id">) })));
  });
}

export async function addTopic(projectId: string, text: string): Promise<string> {
  const ref = await addDoc(topicsCol(projectId), {
    text,
    used: false,
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function addTopicsBulk(projectId: string, texts: string[]): Promise<void> {
  const batch = writeBatch(db);
  const now = Date.now();
  for (const text of texts) {
    batch.set(doc(topicsCol(projectId)), { text, used: false, createdAt: now });
  }
  await batch.commit();
}

export async function setTopicUsed(
  projectId: string,
  topicId: string,
  used: boolean
): Promise<void> {
  await updateDoc(doc(db, "projects", projectId, "topics", topicId), {
    used,
    usedAt: used ? Date.now() : null,
  });
}

export async function deleteTopic(projectId: string, topicId: string): Promise<void> {
  await deleteDoc(doc(db, "projects", projectId, "topics", topicId));
}

export async function clearAllTopics(projectId: string): Promise<void> {
  const snap = await getDocs(topicsCol(projectId));
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

// ---------- Content pipeline ----------

const contentCol = (projectId: string) =>
  collection(db, "projects", projectId, "content");

export function subscribeAllContent(
  cb: (items: ContentItem[]) => void
): Unsubscribe {
  // No orderBy here on purpose: a collection-group query with orderBy requires
  // a manually-created Firestore index. Sorting client-side avoids that setup step.
  return onSnapshot(collectionGroup(db, "content"), (snap) => {
    const items = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ContentItem, "id">),
    }));
    items.sort((a, b) => b.createdAt - a.createdAt);
    cb(items);
  });
}

export function subscribeProjectContent(
  projectId: string,
  cb: (items: ContentItem[]) => void
): Unsubscribe {
  const q = query(contentCol(projectId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ContentItem, "id">) })));
  });
}

export function subscribeContentItem(
  projectId: string,
  contentId: string,
  cb: (item: ContentItem | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, "projects", projectId, "content", contentId), (snap) => {
    cb(snap.exists() ? { id: snap.id, ...(snap.data() as Omit<ContentItem, "id">) } : null);
  });
}

export async function createContentItem(
  projectId: string,
  data: Partial<Omit<ContentItem, "id" | "projectId" | "createdAt" | "updatedAt">>
): Promise<string> {
  const now = Date.now();
  const ref = await addDoc(contentCol(projectId), {
    projectId,
    pillar: data.pillar ?? "",
    ideaSummary: data.ideaSummary ?? "",
    hooks: data.hooks ?? [],
    selectedHookIndex: data.selectedHookIndex ?? null,
    script: data.script ?? null,
    platformVariants: data.platformVariants ?? {},
    platforms: data.platforms ?? [],
    stage: data.stage ?? "idea",
    shootDate: data.shootDate ?? null,
    scheduledAt: data.scheduledAt ?? null,
    postedAt: data.postedAt ?? null,
    stats: data.stats ?? {},
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateContentItem(
  projectId: string,
  contentId: string,
  patch: Partial<Omit<ContentItem, "id" | "projectId" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, "projects", projectId, "content", contentId), {
    ...patch,
    updatedAt: Date.now(),
  });
}

export async function updatePlatformVariant(
  projectId: string,
  contentId: string,
  platform: PlatformKey,
  variant: PlatformVariant
): Promise<void> {
  // Dot-path update so this only ever touches this one platform's variant,
  // never overwrites sibling platforms the way replacing the whole map would.
  await updateDoc(doc(db, "projects", projectId, "content", contentId), {
    [`platformVariants.${platform}`]: variant,
    updatedAt: Date.now(),
  });
}

export async function deleteContentItem(
  projectId: string,
  contentId: string
): Promise<void> {
  await deleteDoc(doc(db, "projects", projectId, "content", contentId));
}
