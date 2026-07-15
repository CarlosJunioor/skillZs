import "server-only";
import { getVercelOidcToken } from "@vercel/oidc";

const API_URL = "https://skills.sh/api/v1";

export type CatalogView = "all-time" | "trending" | "hot";

export interface CatalogSkill {
  id: string;
  slug: string;
  name: string;
  source: string;
  installs: number;
  sourceType: "github" | "well-known";
  installUrl: string | null;
  url: string;
  description?: string;
  isDuplicate?: boolean;
}

export interface CatalogPage {
  data: CatalogSkill[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    hasMore: boolean;
  };
}

export interface CatalogSkillDetail {
  id: string;
  source: string;
  slug: string;
  installs: number;
  hash: string | null;
  files: Array<{ path: string; contents: string }> | null;
}

export interface SkillAudit {
  provider: string;
  slug: string;
  status: "pass" | "warn" | "fail";
  summary: string;
  auditedAt: string;
  riskLevel?: string;
}

async function apiFetch<T>(path: string): Promise<T> {
  const token = await getVercelOidcToken();
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`skills.sh API ${response.status} for ${path}`);
  }
  return response.json() as Promise<T>;
}

export async function listCatalogSkills({
  view = "all-time",
  page = 0,
  perPage = 100,
}: {
  view?: CatalogView;
  page?: number;
  perPage?: number;
} = {}): Promise<CatalogPage> {
  const params = new URLSearchParams({
    view,
    page: String(Math.max(0, Math.floor(page))),
    per_page: String(Math.min(500, Math.max(1, Math.floor(perPage)))),
  });
  return apiFetch<CatalogPage>(`/skills?${params}`);
}

export async function searchCatalogSkills(query: string, limit = 100): Promise<CatalogSkill[]> {
  const q = query.trim().slice(0, 100);
  if (q.length < 2) return [];
  const params = new URLSearchParams({
    q,
    limit: String(Math.min(200, Math.max(1, Math.floor(limit)))),
  });
  const result = await apiFetch<{ data: CatalogSkill[] }>(`/skills/search?${params}`);
  return result.data;
}

export async function getCatalogSkill(parts: string[]): Promise<CatalogSkillDetail | null> {
  try {
    return await apiFetch<CatalogSkillDetail>(`/skills/${parts.map(encodeURIComponent).join("/")}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("API 404")) return null;
    throw error;
  }
}

export async function getSkillAudits(parts: string[]): Promise<SkillAudit[]> {
  try {
    const result = await apiFetch<{ audits: SkillAudit[] }>(
      `/skills/audit/${parts.map(encodeURIComponent).join("/")}`,
    );
    return result.audits;
  } catch (error) {
    console.warn("skills.sh audit unavailable:", error);
    return [];
  }
}

export async function getCatalogTotal(): Promise<number> {
  const page = await listCatalogSkills({ perPage: 1 });
  return page.pagination.total;
}

export async function listCatalogSkillPages(
  startPage: number,
  pageCount: number,
): Promise<CatalogSkill[]> {
  const safeStart = Math.max(0, Math.floor(startPage));
  const safeCount = Math.min(100, Math.max(0, Math.floor(pageCount)));
  const pages = await Promise.all(
    Array.from({ length: safeCount }, (_, index) =>
      listCatalogSkills({ page: safeStart + index, perPage: 500 }),
    ),
  );
  return pages.flatMap((page) => page.data);
}

export function catalogSkillPath(skill: Pick<CatalogSkill, "id">): string {
  return `/skills/${skill.id.split("/").map(encodeURIComponent).join("/")}`;
}
