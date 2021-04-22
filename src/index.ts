import yargs from "yargs"
import * as helpers from "yargs/helpers"
import * as path from "path"
import * as fs from "fs"
import * as fsp from "fs/promises"

interface Config {
  input: string
  output: string
  filter: string
}

interface FileData {
  content: string
  name: string
  path: string
  ext: string
}

async function recursive(
  _path: string,
  filter: (file: FileData) => Promise<boolean> | boolean,
  action: (file: FileData) => unknown
): Promise<void> {
  if (fs.statSync(_path).isDirectory()) {
    const filenames = await fsp.readdir(_path)
    for (const filename of filenames)
      await recursive(path.join(_path, filename), filter, action)
  } else {
    const content = await fsp.readFile(_path, "utf8")
    const file = {
      name: path.basename(_path),
      ext: path.extname(_path),
      path: _path,
      content,
    }
    if (await filter(file)) await action(file)
  }
}

yargs(helpers.hideBin(process.argv))
  .scriptName("brick")
  .usage("$0 <cmd> [args] --options")
  .command({
    command: "build [path]",
    aliases: ["make"],
    describe: "Transpile your code in JS",
    builder: (ctx) =>
      ctx.positional("path", {
        default: ".",
        type: "string",
        describe: "dir path or file path to build",
      }),
    handler: async (args) => {
      const _path = path.join(process.cwd(), args._[0] as string)
      const stats = fs.statSync(_path)

      let config: Config

      if (stats.isDirectory()) {
        if (fs.existsSync(path.join(_path, "brick.config.json"))) {
          config = require(path.join(_path, "brick.config.json"))
        }
      }

      if (!config)
        config = {
          input: "src",
          output: "dist",
          filter: "(file) => file.ext === '.js'",
        }

      const cache = new Map<string, string>()

      function resolve(relativePath: string, content: string): string {
        if (cache.has(relativePath)) return cache.get(relativePath)
        if (/\binclude\s*\(\s*["'`](.+)["'`]\s*\)/.test(content)) {
          content = content.replace(
            /\binclude\s*\(\s*["'`](.+)["'`]\s*\)/g,
            (full, _path) => {
              return resolve(
                path.join(relativePath, _path),
                fs.readFileSync(_path, "utf8")
              )
            }
          )
          cache.set(relativePath, content)
        } else {
          cache.set(relativePath, content)
          return content
        }
      }

      await recursive(
        path.join(process.cwd(), config.input),
        eval(config.filter),
        async (file) => {
          file.path = path.join(
            process.cwd(),
            config.output,
            file.path.replace(path.join(process.cwd(), config.input), "")
          )
          file.content = resolve(file.path, file.content)
          return fsp.writeFile(file.path, file.content, "utf8")
        }
      )
    },
  })
