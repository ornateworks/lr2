# <center>Live Reload Server</center>

## Usage

1.
    In `package.json`

    ```json
    {
        "devServer": {
            "root": "./docs",
            "watch": ["docs/"]
        }
    }
    ```

2.
    Execute

    ```
    $ npx lr2
    ```

## Options

### devServer.root
Directory to serve files from

### devServer.watch
Watch file for changes. Use
[chokidar v4](https://www.npmjs.com/package/chokidar) compatible directory/file patterns

### devServer.ignored
An array of regular expression patterns to exclude from watching. For example, to exclude all `.html` and `.htm` files, do something like

```json
{
    "devServer": {
        "watch": ["www/", "src/"],
        "ignored": ["\\.html?$"]
    }
}
```

### devServer.port
Development server port

### devServer.host
Development server hostname