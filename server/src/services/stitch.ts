import type { Stitch, StitchToolClient } from "@google/stitch-sdk";
import { env, hasStitch } from "../lib/env.js";

type StitchDeviceType = "MOBILE" | "DESKTOP" | "TABLET" | "AGNOSTIC";
type StitchModelId = "GEMINI_3_PRO" | "GEMINI_3_FLASH" | "GEMINI_3_1_PRO";

export type StitchScreenAsset = {
  projectId: string;
  screenId: string;
  htmlUrl?: string;
  imageUrl?: string;
};

export type GenerateStitchScreenInput = {
  prompt: string;
  projectId?: string;
  projectTitle?: string;
  deviceType?: StitchDeviceType;
  modelId?: StitchModelId;
  includeAssets?: boolean;
};

type StitchSdk = typeof import("@google/stitch-sdk");

let sdkPromise: Promise<StitchSdk> | undefined;
let cachedClient: StitchToolClient | undefined;
let cachedStitch: Stitch | undefined;

function loadStitchSdk(): Promise<StitchSdk> {
  sdkPromise ??= (new Function("return import('@google/stitch-sdk')") as () => Promise<StitchSdk>)();
  return sdkPromise;
}

async function getStitch(): Promise<Stitch> {
  if (!hasStitch) {
    throw new Error("Google Stitch is not configured. Set STITCH_API_KEY in server/.env.");
  }

  if (!cachedClient || !cachedStitch) {
    const sdk = await loadStitchSdk();

    if (env.stitchAccessToken) {
      const previousApiKey = process.env.STITCH_API_KEY;
      delete process.env.STITCH_API_KEY;
      try {
        cachedClient = new sdk.StitchToolClient({
          accessToken: env.stitchAccessToken,
          projectId: env.googleCloudProject,
          ...(env.stitchHost ? { baseUrl: env.stitchHost } : {}),
        });
      } finally {
        if (previousApiKey !== undefined) process.env.STITCH_API_KEY = previousApiKey;
      }
    } else {
      cachedClient = new sdk.StitchToolClient({
        apiKey: env.stitchApiKey,
        ...(env.stitchHost ? { baseUrl: env.stitchHost } : {}),
      });
    }

    cachedStitch = new sdk.Stitch(cachedClient);
  }

  return cachedStitch;
}

function normalizeScreen(screen: { projectId: string; screenId: string }): StitchScreenAsset {
  return {
    projectId: screen.projectId,
    screenId: screen.screenId,
  };
}

async function withAssets(
  screen: { projectId: string; screenId: string; getHtml: () => Promise<string>; getImage: () => Promise<string> },
  includeAssets = true,
): Promise<StitchScreenAsset> {
  const result = normalizeScreen(screen);
  if (!includeAssets) return result;

  const [htmlUrl, imageUrl] = await Promise.all([screen.getHtml(), screen.getImage()]);
  return { ...result, htmlUrl, imageUrl };
}

export function getStitchStatus() {
  return {
    configured: hasStitch,
    authMode: env.stitchAccessToken ? "oauth" : env.stitchApiKey ? "apiKey" : null,
    googleCloudProject: env.googleCloudProject || null,
    defaultProjectId: env.stitchProjectId || null,
  };
}

export async function listStitchProjects() {
  const stitch = await getStitch();
  const projects = await stitch.projects();
  return projects.map((project) => ({
    projectId: project.projectId,
    id: project.id,
    title: project.data?.title ?? project.data?.displayName ?? null,
  }));
}

export async function createStitchProject(title = "Saksham Stitch Designs") {
  const stitch = await getStitch();
  const project = await stitch.createProject(title);
  return {
    projectId: project.projectId,
    id: project.id,
    title: project.data?.title ?? project.data?.displayName ?? title,
  };
}

export async function listStitchScreens(projectId: string, includeAssets = false) {
  const stitch = await getStitch();
  const project = stitch.project(projectId);
  const screens = await project.screens();
  return Promise.all(screens.map((screen) => withAssets(screen, includeAssets)));
}

export async function getStitchScreen(projectId: string, screenId: string, includeAssets = true) {
  const stitch = await getStitch();
  const project = stitch.project(projectId);
  const screen = await project.getScreen(screenId);
  return withAssets(screen, includeAssets);
}

export async function generateStitchScreen(input: GenerateStitchScreenInput) {
  const stitch = await getStitch();
  const projectId = input.projectId || env.stitchProjectId;
  const project = projectId
    ? stitch.project(projectId)
    : await stitch.createProject(input.projectTitle || "Saksham Stitch Designs");
  const screen = await project.generate(input.prompt, input.deviceType, input.modelId);

  return withAssets(screen, input.includeAssets ?? true);
}

export function formatStitchError(error: unknown): { status: number; message: string; code?: string } {
  if (error && typeof error === "object" && "code" in error && "message" in error) {
    const code = String(error.code);
    return {
      status: code === "AUTH_FAILED" || String(error.message).includes("API keys are not supported") ? 503 : 502,
      message: String(error.message),
      code,
    };
  }

  if (error instanceof Error && error.message.includes("not configured")) {
    return { status: 503, message: error.message, code: "STITCH_NOT_CONFIGURED" };
  }

  return { status: 500, message: "Google Stitch request failed" };
}
