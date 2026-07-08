import { docs } from "@/.source";
import { loader } from "fumadocs-core/source";

// fumadocs-mdx 11.10 returns `files` as a lazy function (and types it as an
// array), while fumadocs-core 15.8 expects a plain array — unwrap to support
// both shapes at runtime.
const mdxSource = docs.toFumadocsSource();
const rawFiles: unknown = mdxSource.files;
const files = typeof rawFiles === "function" ? rawFiles() : rawFiles;

export const source = loader({
  baseUrl: "/docs",
  source: { files } as typeof mdxSource,
});
