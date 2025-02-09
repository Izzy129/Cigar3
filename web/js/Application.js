import Cell from "./Cell.js"

export default class {
    constructor(core) {
        this.core = core

        this.initRenderer()
        this.initMinimap()

        this.cells = []
        this.cellsByID = new Map()
        this.ownedCells = []
        this.camera = {
            x: 1,
            y: 1,
            s: 1,
            w: 1,
            score: 0,
            target: {
                x: 1,
                y: 1,
                s: 1
            }
        }

        this.loop = this.loop.bind(this)

        this.skins = {}
        this.loop()
    }

    async loadInfos() {
        this.skins = await this.fetchSkins()
        this.servers = await this.fetchServers()
    }

    drawBorder() {
        const border = this.core.net.border
        this.borderGraphics = new PIXI.Graphics()
        .lineStyle(50, 0xffffff)
        .drawRect(-border.width / 2, -border.height / 2, border.width, border.height);

        this.stage.addChild(this.borderGraphics)
    }

    drawBackground() {
        const border = this.core.net.border
        this.backgroundGraphics = new PIXI.Graphics()
        .beginFill(0x222222)
        .drawRect(-border.width / 2, -border.height / 2, border.width, border.height)
        .endFill()

        this.stage.addChild(this.backgroundGraphics)
    }

    initMinimap() {
        const view = this.minimapView = document.getElementById("minimap-view")
        this.minimapRenderer = new PIXI.Renderer({ 
            view,
            width: 250,
            height: 250,
            backgroundAlpha: 0,
            antialiasing: false
        })
        const sprite = this.minimapEntity = new PIXI.Sprite(PIXI.Texture.WHITE)
        sprite.width = 10
        sprite.height = 10
        sprite.anchor.set(.5)
        const stage = this.minimapStage = new PIXI.Container()
        stage.addChild(sprite)
    }

    initRenderer() {
        const view = this.view = document.getElementById("view")
        this.renderer = new PIXI.Renderer({ 
            view,
            width: innerWidth,
            height: innerHeight,
            antialiasing: false
        })
        this.stage = new PIXI.Container()
        this.stage.sortableChildren = true

        const circle = new PIXI.Graphics()
        circle.beginFill(0xffffff)
        circle.drawCircle(256, 256, 256)
        circle.endFill();

        const star = new PIXI.Graphics()
        .beginFill(0xffffff)
        .drawPolygon(new Star(256, 256, 30, 256, 220, 0))
        .endFill();

        const cellRenderTexture = PIXI.RenderTexture.create({ width: 512, height: 512 })
        this.renderer.render(circle, { renderTexture: cellRenderTexture })
        cellRenderTexture.baseTexture.mipmap = true

        const virusRenderTexture = PIXI.RenderTexture.create({ width: 512, height: 512 })
        this.renderer.render(star, { renderTexture: virusRenderTexture })
        virusRenderTexture.baseTexture.mipmap = true

        this.textures = { cell: cellRenderTexture, virus: virusRenderTexture }

        Cell.SPRITE = new PIXI.Sprite(cellRenderTexture)

        PIXI.BitmapFont.from("Nunito", {
            fontSize: 60,
            lineJoin: "round",
            fontFamily: "Nunito",
            fill: "white",
            stroke: "black",
            strokeThickness: 10
        })
    }

    fetchServers() {
        return new Promise((resolve, reject) => {
            fetch('./servers.json')
            .then(response => {
                if (!response.ok) reject()
                return response.json()
            })
            .then(servers => {
                resolve(servers)
            })
        })
    }

    fetchSkins() {
        return new Promise((resolve, reject) => {
            fetch('./skins.json')
            .then(response => {
                if (!response.ok) reject()
                return response.json()
            })
            .then(skins => {
                resolve(skins)
            })
        })
    }

    loop() {
        this.now = Date.now()
        for (const cell of this.cells.slice(0)) { cell.update(this.now) }
        this.updateCamera()

        this.renderer.render(this.stage)
        this.minimapRenderer.render(this.minimapStage)

        requestAnimationFrame(this.loop)
    }

    clear() {
        this.stage.removeChildren()
        this.cells = []
        this.cellsByID = new Map()
        this.ownedCells = []
    }

    updateCamera() {
        const cells = [];
        for (const id of this.ownedCells) {
            const cell = this.cellsByID.get(id);
            if (cell) cells.push(cell);
        }

        let score = 0
        if (cells.length > 0) {
            let x = 0
            let y = 0
            let s = 0
            for (const cell of cells) {
                score += ~~(cell.r * cell.r / 100);
                x += cell.x;
                y += cell.y;
                s += cell.r;
            }
            this.camera.target.x = x / cells.length;
            this.camera.target.y = y / cells.length;
        }

        this.camera.x += (this.camera.target.x - this.camera.x) / 7
        this.camera.y += (this.camera.target.y - this.camera.y) / 7
        this.camera.target.s = 1;
        this.camera.target.s *= this.camera.w / 2;

        this.camera.s += (this.camera.target.s - this.camera.s) / 20;

        this.stage.pivot.set(this.camera.x, this.camera.y)
        this.stage.scale.set(this.camera.s)
        this.stage.position.set(innerWidth / 2, innerHeight / 2)

        this.camera.score = score
    }
}

class Star extends PIXI.Polygon {
    constructor(x, y, points, radius, innerRadius, rotation = 0) {
        innerRadius = innerRadius || radius / 2

        const startAngle = (-1 * Math.PI / 2) + rotation
        const len = points * 2
        const delta = PIXI.PI_2 / len
        const polygon = []

        for (let i = 0; i < len; i++) {
            const r = i % 2 ? innerRadius : radius
            const angle = (i * delta) + startAngle

            polygon.push(
                x + (r * Math.cos(angle)),
                y + (r * Math.sin(angle))
            );
        }

        super(polygon)
    }
}