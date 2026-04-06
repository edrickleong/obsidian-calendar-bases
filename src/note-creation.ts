import { App, Notice, TFile, normalizePath } from "obsidian";

interface CreateNoteOptions {
  folderPath: string;
  templatePath: string;
  date: Date;
  startDateProp: string;
  createNoteFailedMessage: string;
  createNoteNeedsTemplaterMessage: string;
}

export async function createNoteForDate(
  app: App,
  options: CreateNoteOptions,
): Promise<void> {
  const folderPath = normalizeFolderPath(options.folderPath);
  const startDateKey = options.startDateProp.startsWith("note.")
    ? options.startDateProp.slice(5)
    : options.startDateProp;
  const title = formatDate(options.date);
  const templateFile = resolveTemplateFile(app, options.templatePath);

  try {
    if (!templateFile) {
      throw new Error("Template file not found");
    }

    const templaterFile = await maybeCreateWithTemplater(
      app,
      templateFile,
      title,
      folderPath,
    );

    if (!templaterFile) {
      new Notice(options.createNoteNeedsTemplaterMessage);
      return;
    }

    await ensureDateFrontmatter(
      app,
      templaterFile,
      startDateKey,
      options.date,
    );
  } catch (error) {
    console.error("Failed to create calendar note", error);
    new Notice(options.createNoteFailedMessage);
  }
}

function normalizeFolderPath(folderPath: string): string {
  const trimmed = folderPath.trim().replace(/^\/+|\/+$/g, "");
  return trimmed ? normalizePath(trimmed) : "";
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function resolveTemplateFile(app: App, templatePath: string): TFile | null {
  const trimmedPath = templatePath.trim();
  if (!trimmedPath) {
    return null;
  }

  const normalizedPath = normalizePath(trimmedPath);
  const directMatch = app.vault.getAbstractFileByPath(normalizedPath);
  if (directMatch instanceof TFile) {
    return directMatch;
  }

  const markdownPath = normalizedPath.endsWith(".md")
    ? normalizedPath
    : `${normalizedPath}.md`;
  const markdownMatch = app.vault.getAbstractFileByPath(markdownPath);
  if (markdownMatch instanceof TFile) {
    return markdownMatch;
  }

  return (
    app.vault
      .getMarkdownFiles()
      .find(
        (file) =>
          file.path === markdownPath ||
          file.path === normalizedPath ||
          file.basename === trimmedPath,
      ) ?? null
  );
}

async function maybeCreateWithTemplater(
  app: App,
  templateFile: TFile | null,
  filename: string,
  folderPath: string,
): Promise<TFile | null> {
  if (!templateFile) {
    return null;
  }

  const templaterApi = getTemplaterApi(app);
  if (!templaterApi) {
    return null;
  }

  const createdFile = await templaterApi.create_new_note_from_template(
    templateFile,
    folderPath || undefined,
    filename,
    true,
  );

  return createdFile ?? null;
}

async function ensureDateFrontmatter(
  app: App,
  file: TFile,
  startDateKey: string,
  date: Date,
): Promise<void> {
  if (!startDateKey) {
    return;
  }

  await wait(75);
  await app.fileManager.processFrontMatter(file, (frontmatter) => {
    if (frontmatter[startDateKey]) {
      return;
    }

    frontmatter[startDateKey] = formatDate(date);
  });
}

function getTemplaterApi(app: App): {
  create_new_note_from_template: (
    template: TFile | string,
    folder?: string,
    filename?: string,
    open_new_note?: boolean,
  ) => Promise<TFile | undefined>;
} | null {
  const pluginHost = app as App & {
    plugins?: {
      plugins?: Record<string, unknown>;
    };
  };
  const templaterPlugin = pluginHost.plugins?.plugins?.["templater-obsidian"] as
    | {
        templater?: {
          create_new_note_from_template?: (
            template: TFile | string,
            folder?: string,
            filename?: string,
            open_new_note?: boolean,
          ) => Promise<TFile | undefined>;
        };
        api?: {
          create_new_note_from_template?: (
            template: TFile | string,
            folder?: string,
            filename?: string,
            open_new_note?: boolean,
          ) => Promise<TFile | undefined>;
        };
      }
    | undefined;

  return (
    templaterPlugin?.templater?.create_new_note_from_template
      ? templaterPlugin.templater
      : templaterPlugin?.api?.create_new_note_from_template
        ? templaterPlugin.api
        : null
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
