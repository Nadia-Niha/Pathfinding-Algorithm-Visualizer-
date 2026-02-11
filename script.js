const rows = 20;
const cols = 30;
const gridElement = document.getElementById("grid");
const stats = document.getElementById("stats");
let mouseDown = false;
let dragNode = null;
let grid = [];
let startNode = { row: 10, col: 5 };
let endNode = { row: 10, col: 25 };

gridElement.style.gridTemplateColumns = `repeat(${cols}, 25px)`;

// Initialize grid
function createGrid() {
    gridElement.innerHTML = "";
    grid = [];

    for (let r = 0; r < rows; r++) {
        let row = [];
        for (let c = 0; c < cols; c++) {
            const nodeEl = document.createElement("div");
            nodeEl.classList.add("node", "weight1");
            nodeEl.dataset.row = r;
            nodeEl.dataset.col = c;

            nodeEl.addEventListener("mousedown", () => nodeClick(r, c));
            nodeEl.addEventListener("mouseover", () => { if (mouseDown) nodeClick(r, c); });
            nodeEl.addEventListener("mouseup", () => dragNode = null);
            nodeEl.addEventListener("dragstart", e => e.preventDefault());

            gridElement.appendChild(nodeEl);

            row.push({ row: r, col: c, weight: 1, distance: Infinity, previous: null, isWall: false });
        }
        grid.push(row);
    }

    updateNodeClass(startNode, "start");
    updateNodeClass(endNode, "end");
}

document.body.onmousedown = () => mouseDown = true;
document.body.onmouseup = () => { mouseDown = false; dragNode = null; };

function getNode(pos) { return document.querySelector(`[data-row='${pos.row}'][data-col='${pos.col}']`); }
function updateNodeClass(pos, className) { getNode(pos).className = "node " + className; }

function nodeClick(r, c) {
    if (dragNode) {
        if (dragNode.type === "start") { updateNodeClass(startNode, grid[startNode.row][startNode.col].isWall ? "wall" : "weight" + grid[startNode.row][startNode.col].weight); startNode = { row: r, col: c }; updateNodeClass(startNode, "start"); }
        else if (dragNode.type === "end") { updateNodeClass(endNode, grid[endNode.row][endNode.col].isWall ? "wall" : "weight" + grid[endNode.row][endNode.col].weight); endNode = { row: r, col: c }; updateNodeClass(endNode, "end"); }
        return;
    }

    if (r === startNode.row && c === startNode.col) { dragNode = { type: "start" }; return; }
    if (r === endNode.row && c === endNode.col) { dragNode = { type: "end" }; return; }

    const value = document.getElementById("traffic").value;
    const node = grid[r][c];
    const el = getNode({ row: r, col: c });

    el.className = "node";
    if (value === "wall") { node.isWall = true; node.weight = Infinity; el.classList.add("wall"); }
    else { node.isWall = false; node.weight = parseInt(value); el.classList.add("weight" + value); }
}

function getNeighbors(node) {
    const directions = [[0,1],[1,0],[0,-1],[-1,0],[1,1],[-1,-1],[1,-1],[-1,1]];
    let neighbors = [];
    for (let [dr,dc] of directions) {
        let r = node.row+dr, c=node.col+dc;
        if (r>=0 && r<rows && c>=0 && c<cols && !grid[r][c].isWall) {
            let cost = (dr!==0 && dc!==0) ? Math.SQRT2*grid[r][c].weight : grid[r][c].weight;
            neighbors.push({ node:grid[r][c], cost: cost });
        }
    }
    return neighbors;
}

function heuristic(a,b) { return Math.abs(a.row-b.row)+Math.abs(a.col-b.col); }

async function dijkstra() {
    let visitedCount=0;
    let start=grid[startNode.row][startNode.col];
    start.distance=0;
    let unvisited=grid.flat();

    while(unvisited.length){
        unvisited.sort((a,b)=>a.distance-b.distance);
        let closest=unvisited.shift();
        if(closest.isWall||closest.distance===Infinity) continue;

        visitedCount++;
        if(closest.row===endNode.row && closest.col===endNode.col) break;

        for(let {node:neighbor, cost} of getNeighbors(closest)){
            let newDist = closest.distance + cost;
            if(newDist < neighbor.distance){ neighbor.distance = newDist; neighbor.previous = closest; }
        }
        await animate(closest);
    }
    return visitedCount;
}

async function astar(){
    let visitedCount=0;
    let start=grid[startNode.row][startNode.col];
    let end=grid[endNode.row][endNode.col];
    start.distance=0;
    let openSet=[start];

    while(openSet.length>0){
        openSet.sort((a,b)=>(a.distance+heuristic(a,end))-(b.distance+heuristic(b,end)));
        let current=openSet.shift();
        if(current.isWall) continue;
        visitedCount++;
        if(current===end) break;

        for(let {node:neighbor, cost} of getNeighbors(current)){
            let tempG=current.distance+cost;
            if(tempG<neighbor.distance){ neighbor.distance=tempG; neighbor.previous=current; if(!openSet.includes(neighbor)) openSet.push(neighbor); }
        }
        await animate(current);
    }
    return visitedCount;
}

async function visualize(){
    clearPath();
    let startTime=performance.now();
    let algo=document.getElementById("algorithm").value;
    let visited;
    if(algo==="astar") visited=await astar();
    else visited=await dijkstra();
    let endTime=performance.now();
    drawPath();
    stats.innerHTML=`Nodes Visited: ${visited} | Total Cost: ${grid[endNode.row][endNode.col].distance.toFixed(2)} | Time: ${(endTime-startTime).toFixed(2)} ms`;
}

function drawPath(){
    let current=grid[endNode.row][endNode.col];
    let pathLength=0;
    while(current.previous){ getNode(current).classList.add("path"); current=current.previous; pathLength++; }
    stats.innerHTML+=` | Path Length: ${pathLength}`;
}

function clearPath(){ document.querySelectorAll(".visited,.path").forEach(el=>el.classList.remove("visited","path")); grid.flat().forEach(n=>{ n.distance=Infinity;n.previous=null; }); }
function clearBoard(){ createGrid(); stats.innerHTML=""; }

function animate(node){ return new Promise(resolve=>{ setTimeout(()=>{ if(!((node.row===startNode.row && node.col===startNode.col)||(node.row===endNode.row && node.col===endNode.col))) getNode(node).classList.add("visited"); resolve(); },1000/document.getElementById("speed").value); }); }

function generateRandom(){
    for(let r=0;r<rows;r++){ for(let c=0;c<cols;c++){
        const node=grid[r][c]; if((r===startNode.row && c===startNode.col)||(r===endNode.row && c===endNode.col)) continue;
        const rand=Math.random();
        if(rand<0.2){ node.isWall=true; node.weight=Infinity; getNode({row:r,col:c}).className="node wall"; }
        else if(rand<0.5){ node.isWall=false; node.weight=5; getNode({row:r,col:c}).className="node weight5"; }
        else if(rand<0.7){ node.isWall=false; node.weight=10; getNode({row:r,col:c}).className="node weight10"; }
        else if(rand<0.85){ node.isWall=false; node.weight=20; getNode({row:r,col:c}).className="node weight20"; }
        else{ node.isWall=false; node.weight=1; getNode({row:r,col:c}).className="node weight1"; }
    }}
}

createGrid();
