const { app, BrowserWindow, shell, ipcMain } = require("electron");
const path = require("path");
const net = require("net");
const http = require("http");
const fs = require("fs");
const { fork } = require("child_process");

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
let mainWindow = null;
let serverProcess = null;

// Find an available port
function getFreePort() {
    return new Promise((resolve, reject) => {
        const srv = net.createServer();
        srv.listen(0, "127.0.0.1", () => {
            const port = srv.address().port;
            srv.close(() => resolve(port));
        });
        srv.on("error", reject);
    });
}

// Wait for a URL to return a 200/300 response
function waitForServer(url, timeoutMs = 20000) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
        const check = () => {
            const req = http.get(url, (res) => {
                resolve();
            });
            req.on("error", () => {
                if (Date.now() - start > timeoutMs) {
                    reject(new Error("Server startup timed out"));
                } else {
                    setTimeout(check, 300);
                }
            });
        };
        check();
    });
}

// Prepare the SQLite database in user's data directory for production
function setupProductionDatabase() {
    const userDataDir = app.getPath("userData");
    const targetDbPath = path.join(userDataDir, "poko.db");

    if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
    }

    // If database doesn't exist in userData, copy template dev.db if present
    if (!fs.existsSync(targetDbPath)) {
        const templateDbPath = path.join(process.resourcesPath || __dirname, "dev.db");
        if (fs.existsSync(templateDbPath)) {
            try {
                fs.copyFileSync(templateDbPath, targetDbPath);
            } catch (err) {
                console.error("Failed to copy template db:", err);
            }
        }
    }

    return targetDbPath;
}

async function startProductionServer(port) {
    const dbPath = setupProductionDatabase();

    const env = {
        ...process.env,
        NODE_ENV: "production",
        PORT: String(port),
        HOSTNAME: "127.0.0.1",
        DATABASE_URL: `file:${dbPath}`,
    };

    if (!env.JWT_SECRET) {
        env.JWT_SECRET = "poko-desktop-local-secret-" + app.getPath("userData");
    }

    // Path to Next.js standalone server
    const candidates = [
        path.join(process.resourcesPath || "", "app.asar.unpacked", ".next", "standalone", "server.js"),
        path.join(__dirname, "..", ".next", "standalone", "server.js"),
        path.join(app.getAppPath(), ".next", "standalone", "server.js"),
    ];

    const serverPath = candidates.find((p) => fs.existsSync(p)) || candidates[1];

    if (!fs.existsSync(serverPath)) {
        throw new Error(`Standalone server not found at: ${serverPath}`);
    }

    serverProcess = fork(serverPath, [], {
        env,
        stdio: "inherit",
        cwd: path.dirname(serverPath),
    });

    serverProcess.on("error", (err) => {
        console.error("Next.js server error:", err);
    });

    await waitForServer(`http://127.0.0.1:${port}`);
}

async function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 850,
        minWidth: 800,
        minHeight: 600,
        title: "Poko",
        backgroundColor: "#0a0a0a",
        titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
        trafficLightPosition: { x: 16, y: 16 },
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    let targetUrl;

    if (isDev) {
        targetUrl = "http://localhost:3000";
        console.log("Connecting to Next.js development server at", targetUrl);
        await waitForServer(targetUrl, 30000).catch(() => {
            console.warn("Dev server not ready yet, loading anyway...");
        });
    } else {
        const port = await getFreePort();
        console.log("Starting Next.js standalone server on port", port);
        await startProductionServer(port);
        targetUrl = `http://127.0.0.1:${port}`;
    }

    mainWindow.loadURL(targetUrl);

    // Open external links in default OS browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith("http://") || url.startsWith("https://")) {
            shell.openExternal(url);
            return { action: "deny" };
        }
        return { action: "allow" };
    });

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

app.whenReady().then(async () => {
    try {
        await createWindow();
    } catch (err) {
        console.error("Failed to create window:", err);
    }

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("before-quit", () => {
    if (serverProcess) {
        try {
            serverProcess.kill();
        } catch (e) {}
        serverProcess = null;
    }
});
