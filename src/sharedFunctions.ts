import type { App, FrontMatterCache, TFile } from "obsidian";
import { dropHeaderOrAlias, splitLinksRegex } from "src/constants";
import type {
  BreadcrumbsSettings,
  fileFrontmatter,
  neighbourObj,
} from "src/interfaces";
import type BreadcrumbsPlugin from "src/main";

export function getFileFrontmatterArr(
  app: App,
  settings: BreadcrumbsSettings
): fileFrontmatter[] {
  const files: TFile[] = app.vault.getMarkdownFiles();
  const fileFrontMatterArr: fileFrontmatter[] = [];

  // If dataview is **enabled** (not just installed), use its index
  if (app.plugins.plugins.dataview !== undefined) {
    if (settings.debugMode) {
      console.log("Using Dataview metadataCache");
    }
    app.workspace.onLayoutReady(() => {
      files.forEach((file) => {
        if (settings.superDebugMode) {
          console.log(`Get frontmatter: ${file.basename}`);
        }
        const dv: FrontMatterCache =
          app.plugins.plugins.dataview.api.page(file.path) ?? [];

        if (settings.superDebugMode) {
          console.log({ dv });
        }
        fileFrontMatterArr.push({ file, frontmatter: dv });
      });
    });
  }
  // Otherwise use Obsidian's
  else {
    if (settings.debugMode) {
      console.log("Using Obsidian metadataCache");
    }
    files.forEach((file) => {
      const obs: FrontMatterCache =
        app.metadataCache.getFileCache(file).frontmatter ?? [];
      fileFrontMatterArr.push({
        file,
        frontmatter: obs,
      });
    });
  }
  if (settings.debugMode) {
    console.log({ fileFrontMatterArr });
  }
  return fileFrontMatterArr;
}

export function splitAndDrop(str: string): string[] | [] {
  return (
    str
      ?.match(splitLinksRegex)
      ?.map((link) => link.match(dropHeaderOrAlias)?.[1]) ?? []
  );
}

export function getFields(
  fileFrontmatter: fileFrontmatter,
  field: string,
  settings: BreadcrumbsSettings
): string[] {
  if (settings.superDebugMode) {
    console.log(`Get ${field} of: ${fileFrontmatter.file.basename}`);
  }
  const fieldItems: string | [] = fileFrontmatter.frontmatter[field] ?? [];

  if (typeof fieldItems === "string") {
    const links =
      splitAndDrop(fieldItems)?.map((value) => value.split("/").last()) ?? [];
    return links;
  } else {
    const links: string[] =
      [fieldItems]
        .flat()
        ?.map(
          (link) => link.path.split("/").last() ?? link.split("/").last()
        ) ?? [];
    return links;
  }
}

export const splitAndTrim = (fields: string): string[] =>
  fields.split(",").map((str: string) => str.trim());

export function getNeighbourObjArr(
  plugin: BreadcrumbsPlugin,
  fileFrontmatterArr: fileFrontmatter[]
): neighbourObj[] {
  const { parentFieldName, siblingFieldName, childFieldName } = plugin.settings;

  const [parentFields, siblingFields, childFields] = [
    splitAndTrim(parentFieldName),
    splitAndTrim(siblingFieldName),
    splitAndTrim(childFieldName),
  ];

  const neighbourObjArr: neighbourObj[] = fileFrontmatterArr.map(
    (fileFrontmatter) => {
      const [parents, siblings, children] = [
        parentFields
          .map(
            (parentField) =>
              getFields(fileFrontmatter, parentField, plugin.settings) ?? []
          )
          .flat(),
        siblingFields
          .map(
            (siblingField) =>
              getFields(fileFrontmatter, siblingField, plugin.settings) ?? []
          )
          .flat(),
        childFields
          .map(
            (childField) =>
              getFields(fileFrontmatter, childField, plugin.settings) ?? []
          )
          .flat(),
      ];
      return { current: fileFrontmatter.file, parents, siblings, children };
    }
  );
  if (plugin.settings.debugMode) {
    console.log({ neighbourObjArr });
  }
  return neighbourObjArr;
}

// This doesn't work for some reason. Even if you pass it `app`, metadatacache is undefined
// export function resolvedClass(
//   app: App,
//   toFile: string,
//   currFile: TFile
// ):
//   | "internal-link is-unresolved breadcrumbs-link"
//   | "internal-link breadcrumbs-link" {
//   return app.metadataCache.unresolvedLinks[currFile.path][toFile] > 0
//     ? "internal-link is-unresolved breadcrumbs-link"
//     : "internal-link breadcrumbs-link";
// }