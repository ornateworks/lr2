#!/usr/bin/env node

import chokidar from 'chokidar'
import mimeTypes from 'mime-types'
import fsPromise from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { readPackageUp } from 'read-package-up'

const { packageJson, path: packageJsonPath } = await readPackageUp()
const options = packageJson.devServer || packageJson.lr2
const projectRoot = path.dirname(packageJsonPath)

if (!options)
{
    process.stderr.write('No configuration found')
    process.exit(1)
}

const port = parseInt(options.port || '8000')
const host = options.host || 'localhost'
const root = path.resolve(projectRoot, options.root || '')

let pendingRefresh = false

/**
 * Watch for file changes
 */
if (options.watch)
{
    /**
     * @type { import('chokidar').ChokidarOptions }
     */
    const chokidarOptions = {
        cwd: projectRoot,
        usePolling: true,
    }

    if (options.ignored)
    {
        chokidarOptions.ignored = (path, stats) =>
        {
            for (const pattern of options.ignored)
            {
                return new RegExp(pattern).test(path)
            }
        }
    }

    chokidar.watch(options.watch, chokidarOptions).on('all', () =>
    {
        pendingRefresh = true
    })
}


/**
 * Spawns a dev server instance
 * @returns { Promise<void> }
 */
function devServer()
{
    return new Promise((resolve, reject) =>
    {
        const server = http.createServer(async (req, res) =>
        {
            const url = new URL(`http://${host}:${port}${req.url}`)

            if (url.pathname === '/events')
            {
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive'
                })

                let iid

                iid = setInterval(() =>
                {
                    if (pendingRefresh)
                    {
                        res.write('event: reload\n')
                        res.write('data: \n\n')
                        pendingRefresh = false
                    }
                },
                200)

                req.on('close', () =>
                {
                    clearInterval(iid)
                    res.end()
                })

                return
            }

            try
            {
                let file
                let fileStat

                const tryFiles = [
                    path.join(root, url.pathname),
                    path.join(root, url.pathname, 'index.html')
                ]

                for (const tryFile of tryFiles)
                {
                    fileStat = await fsPromise.stat(tryFile)

                    if (fileStat.isFile())
                    {
                        file = tryFile; break
                    }
                }

                let ext = path.extname(file)
                let mime = mimeTypes.lookup(ext)      
                let content = await fsPromise.readFile(file)

                if (mime === 'text/html')
                {
                    content = content.toString('utf-8').replace('</head>', `
                        <script>
                            (new EventSource('/events')).addEventListener('reload', () => location.reload())
                        </script>
                        </head>
                    `)
                }

                res.setHeader('Content-Type', mime)
                res.setHeader('Content-Size', content.length)
                res.end(content)
            }
            catch (err)
            {
                res.end()
            }
        })

        server.on('error', () =>
        {
            reject(err)
        })

        server.listen(port, host, () =>
        {
            resolve(server)
        })
    })
}

devServer().then(() =>
{
    console.log(`Server started: http://${host}:${port}`)
})