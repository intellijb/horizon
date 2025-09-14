#!/usr/bin/env node

import { readdir, readFile, writeFile, stat } from "fs/promises"
import { join, dirname, relative } from "path"

async function fileExists(path) {
  try {
    const stats = await stat(path)
    return stats.isFile()
  } catch {
    return false
  }
}

async function directoryExists(path) {
  try {
    const stats = await stat(path)
    return stats.isDirectory()
  } catch {
    return false
  }
}

async function resolveModulePath(importPath, currentFile, baseDir) {
  // Handle path aliases
  if (importPath.startsWith("@/")) {
    // @/ maps to root of dist
    const targetPath = join(baseDir, importPath.replace("@/", ""))
    const currentDir = dirname(currentFile)
    const relativePath = relative(currentDir, targetPath)
    return relativePath.startsWith(".") ? relativePath : "./" + relativePath
  } else if (importPath.startsWith("@modules/")) {
    // @modules/ maps to modules/
    const targetPath = join(baseDir, importPath.replace("@modules/", "modules/"))
    const currentDir = dirname(currentFile)
    const relativePath = relative(currentDir, targetPath)
    return relativePath.startsWith(".") ? relativePath : "./" + relativePath
  } else if (importPath === "@config") {
    // @config maps to config
    const targetPath = join(baseDir, "config")
    const currentDir = dirname(currentFile)
    const relativePath = relative(currentDir, targetPath)
    return relativePath.startsWith(".") ? relativePath : "./" + relativePath
  }

  return importPath
}

async function fixImports(dir, baseDir = dir) {
  const files = await readdir(dir, { withFileTypes: true })

  for (const file of files) {
    const fullPath = join(dir, file.name)

    if (file.isDirectory()) {
      await fixImports(fullPath, baseDir)
    } else if (file.name.endsWith(".js")) {
      let content = await readFile(fullPath, "utf8")

      // Process all import/export from statements
      const importMatches = Array.from(content.matchAll(/from\s+["']([^"']+)["']/g))

      for (const match of importMatches) {
        const originalPath = match[1]
        let resolvedPath = await resolveModulePath(originalPath, fullPath, baseDir)

        // Only process relative imports and resolved aliases
        if (resolvedPath.startsWith(".")) {
          if (!resolvedPath.endsWith(".js") && !resolvedPath.endsWith(".json")) {
            const basePath = join(dirname(fullPath), resolvedPath)
            const indexPath = join(basePath, "index.js")

            if (await directoryExists(basePath) && await fileExists(indexPath)) {
              resolvedPath = `${resolvedPath}/index.js`
            } else {
              resolvedPath = `${resolvedPath}.js`
            }
          }

          if (originalPath !== resolvedPath) {
            content = content.replace(
              `from "${originalPath}"`,
              `from "${resolvedPath}"`
            ).replace(
              `from '${originalPath}'`,
              `from "${resolvedPath}"`
            )
          }
        }
      }

      // Fix dynamic imports
      const dynamicImportMatches = Array.from(content.matchAll(/import\s*\(\s*["']([^"']+)["']\s*\)/g))

      for (const match of dynamicImportMatches) {
        const originalPath = match[1]
        let resolvedPath = await resolveModulePath(originalPath, fullPath, baseDir)

        if (resolvedPath.startsWith(".")) {
          if (!resolvedPath.endsWith(".js") && !resolvedPath.endsWith(".json")) {
            const basePath = join(dirname(fullPath), resolvedPath)
            const indexPath = join(basePath, "index.js")

            if (await directoryExists(basePath) && await fileExists(indexPath)) {
              resolvedPath = `${resolvedPath}/index.js`
            } else {
              resolvedPath = `${resolvedPath}.js`
            }
          }

          if (originalPath !== resolvedPath) {
            content = content.replace(
              `import("${originalPath}")`,
              `import("${resolvedPath}")`
            ).replace(
              `import('${originalPath}')`,
              `import("${resolvedPath}")`
            )
          }
        }
      }

      // Fix standalone import statements
      const standaloneImportMatches = Array.from(content.matchAll(/^import\s+["']([^"']+)["']/gm))

      for (const match of standaloneImportMatches) {
        const originalPath = match[1]
        let resolvedPath = await resolveModulePath(originalPath, fullPath, baseDir)

        if (resolvedPath.startsWith(".")) {
          if (!resolvedPath.endsWith(".js") && !resolvedPath.endsWith(".json")) {
            resolvedPath = `${resolvedPath}.js`
          }

          if (originalPath !== resolvedPath) {
            content = content.replace(
              `import "${originalPath}"`,
              `import "${resolvedPath}"`
            ).replace(
              `import '${originalPath}'`,
              `import "${resolvedPath}"`
            )
          }
        }
      }

      await writeFile(fullPath, content, "utf8")
    }
  }
}

fixImports("./dist")
  .then(() => console.log("✅ Fixed ESM imports"))
  .catch(console.error)