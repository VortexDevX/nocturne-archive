import { remoteUpload } from "@/lib/novels/remote-upload";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) { return remoteUpload(request, "prepare"); }
